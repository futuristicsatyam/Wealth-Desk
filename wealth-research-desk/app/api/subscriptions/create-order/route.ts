import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/session";
import { verifyOrigin } from "@/lib/csrf";
import { consumeRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient, isRazorpayConfigured } from "@/lib/razorpay";
import { planTypeFromDuration } from "@/lib/subscription";
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

  try {
    const order = await getRazorpayClient().orders.create({
      amount: plan.amountPaise,
      currency: "INR",
      receipt: `wrd_${user.id.slice(-8)}_${Date.now()}`,
      notes: { userId: user.id, planCode: plan.code }
    });

    await prisma.payment.create({
      data: {
        userId: user.id,
        amountPaise: plan.amountPaise,
        currency: "INR",
        status: "CREATED",
        razorpayOrderId: order.id,
        planCode: plan.code,
        planName: plan.name,
        planType: planTypeFromDuration(plan.durationDays, false),
        durationDays: plan.durationDays
      }
    });

    return NextResponse.json({
      orderId: order.id,
      amount: plan.amountPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      planName: plan.name,
      customer: { name: user.name, email: user.email, contact: user.phone }
    });
  } catch (error) {
    console.error("[create-order] failed", error);
    return NextResponse.json({ message: "Could not create payment order" }, { status: 502 });
  }
}
