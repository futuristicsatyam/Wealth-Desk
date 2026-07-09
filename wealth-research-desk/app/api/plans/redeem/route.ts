import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/session";
import { verifyOrigin, getClientIp } from "@/lib/csrf";
import { consumeRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  grantSubscriptionFromPayment,
  planTypeFromDuration,
  countPlanRedemptions,
  hasActivePlan
} from "@/lib/subscription";
import { logAudit } from "@/lib/audit";
import { redeemPlanSchema, firstError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Activates a FREE (₹0) private/special plan directly from its access link —
 * no payment step. Paid private plans go through the normal Razorpay checkout
 * (create-order + verify) instead. Idempotent per user via hasActivePlan.
 */
export async function POST(request: NextRequest) {
  if (!verifyOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }

  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limit = await consumeRateLimit(`redeem:${user.id}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ message: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = redeemPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: firstError(parsed.error) }, { status: 400 });
  }

  const plan = await prisma.planConfig.findUnique({ where: { accessToken: parsed.data.accessToken } });
  if (!plan || !plan.isActive || !plan.isPrivate) {
    return NextResponse.json({ message: "This access link is invalid or has expired" }, { status: 404 });
  }
  if (plan.amountPaise > 0) {
    return NextResponse.json({ message: "This plan requires payment" }, { status: 400 });
  }

  if (await hasActivePlan(user.id, plan.code)) {
    return NextResponse.json({ ok: true, message: "This plan is already active on your account", alreadyDone: true });
  }
  if (plan.maxRedemptions != null && (await countPlanRedemptions(plan.code)) >= plan.maxRedemptions) {
    return NextResponse.json({ message: "This access link has reached its member limit" }, { status: 403 });
  }

  // Record a ₹0 CAPTURED payment (via the shared grant path) so the activation
  // is tracked identically to paid ones and counts toward maxRedemptions.
  const syntheticOrderId = `free_${crypto.randomBytes(12).toString("hex")}`;
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      amountPaise: 0,
      gstAmountPaise: 0,
      currency: "INR",
      status: "CREATED",
      razorpayOrderId: syntheticOrderId,
      planCode: plan.code,
      planName: plan.name,
      planType: planTypeFromDuration(plan.durationDays, plan.isTrial),
      durationDays: plan.durationDays,
      referralBonusDays: plan.referralBonusDays
    }
  });

  const result = await grantSubscriptionFromPayment({
    paymentId: payment.id,
    razorpayPaymentId: syntheticOrderId
  });

  if (!result.granted && result.reason !== "already_processed") {
    return NextResponse.json({ message: "Could not activate the plan" }, { status: 500 });
  }

  await logAudit({
    actorId: user.id,
    actorName: user.name,
    action: "PLAN_REDEEMED",
    entity: "PlanConfig",
    entityId: plan.id,
    summary: `${user.name} activated free special plan ${plan.name} (${plan.code})`,
    metadata: { planCode: plan.code },
    ipAddress: ip
  });

  return NextResponse.json({ ok: true, message: "Plan activated" });
}
