import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/session";
import { verifyOrigin } from "@/lib/csrf";
import { consumeRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient, isRazorpayConfigured } from "@/lib/razorpay";
import { planTypeFromDuration, countPlanRedemptions, hasActivePlan } from "@/lib/subscription";
import { validateCoupon } from "@/lib/coupons";
import { createOrderSchema, firstError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Creates a Razorpay order for a paid plan and records a CREATED Payment. */
export async function POST(request: NextRequest) {
  if (!verifyOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }

  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { message: "Online payments are not configured. Please contact support." },
      { status: 503 }
    );
  }

  const limit = await consumeRateLimit(`order:${user.id}`, 12, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ message: "Too many payment attempts." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: firstError(parsed.error) }, { status: 400 });
  }

  const plan = await prisma.planConfig.findUnique({ where: { code: parsed.data.planCode } });
  if (!plan || !plan.isActive) {
    return NextResponse.json({ message: "Selected plan is unavailable" }, { status: 404 });
  }
  if (plan.isTrial || plan.amountPaise <= 0) {
    return NextResponse.json({ message: "This plan cannot be purchased online" }, { status: 400 });
  }

  // Private/special plans require a matching access token and honour the
  // redemption cap. This is the authoritative server-side gate — the link is
  // the only way to reach a private plan's checkout.
  if (plan.isPrivate) {
    if (!parsed.data.accessToken || parsed.data.accessToken !== plan.accessToken) {
      return NextResponse.json({ message: "A valid access link is required for this plan" }, { status: 403 });
    }
    if (await hasActivePlan(user.id, plan.code)) {
      return NextResponse.json({ message: "You already have this plan active" }, { status: 409 });
    }
    if (plan.maxRedemptions != null && (await countPlanRedemptions(plan.code)) >= plan.maxRedemptions) {
      return NextResponse.json({ message: "This access link has reached its member limit" }, { status: 403 });
    }
  }

  // Apply a coupon if one was supplied. Re-validated server-side so a tampered
  // client can't smuggle in a bogus discount — the Razorpay order is created
  // for the discounted amount computed here, never a client-provided figure.
  let chargeAmountPaise = plan.amountPaise;
  let discountPaise = 0;
  let appliedCouponCode: string | null = null;
  if (parsed.data.couponCode) {
    const couponResult = await validateCoupon({
      code: parsed.data.couponCode,
      plan,
      userId: user.id
    });
    if (!couponResult.ok) {
      return NextResponse.json({ message: couponResult.reason }, { status: 400 });
    }
    chargeAmountPaise = couponResult.pricing.finalPaise;
    discountPaise = couponResult.pricing.discountPaise;
    appliedCouponCode = couponResult.coupon.code;
  }

  try {
    const order = await getRazorpayClient().orders.create({
      amount: chargeAmountPaise,
      currency: "INR",
      receipt: `wrd_${user.id.slice(-8)}_${Date.now()}`,
      notes: { userId: user.id, planCode: plan.code, coupon: appliedCouponCode ?? "" }
    });

    await prisma.payment.create({
      data: {
        userId: user.id,
        amountPaise: chargeAmountPaise,
        currency: "INR",
        status: "CREATED",
        razorpayOrderId: order.id,
        planCode: plan.code,
        planName: plan.name,
        planType: planTypeFromDuration(plan.durationDays, false),
        durationDays: plan.durationDays,
        referralBonusDays: plan.referralBonusDays,
        couponCode: appliedCouponCode,
        discountPaise: discountPaise || null
      }
    });

    return NextResponse.json({
      orderId: order.id,
      amount: chargeAmountPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      planName: plan.name,
      couponCode: appliedCouponCode,
      discountPaise,
      customer: { name: user.name, email: user.email, contact: user.phone }
    });
  } catch (error) {
    console.error("[create-order] failed", error);
    return NextResponse.json({ message: "Could not create payment order" }, { status: 502 });
  }
}
