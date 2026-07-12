import type { Coupon, PlanConfig } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// The prisma client is $extends-wrapped, so the transaction client isn't the
// plain Prisma.TransactionClient — derive it from the actual client by dropping
// the top-level `$` methods (which a transaction scope doesn't expose).
type TxClient = Omit<typeof prisma, `$${string}`>;

/** Razorpay's minimum order amount is ₹1 — a discount can never take the charge below this. */
const MIN_CHARGE_PAISE = 100;

export type CouponPricing = {
  discountPaise: number;
  finalPaise: number;
};

/** Computes the discount and the resulting charge for a coupon against a plan price. */
export function computeCouponPricing(coupon: Coupon, amountPaise: number): CouponPricing {
  let discount =
    coupon.discountType === "PERCENT"
      ? Math.round((amountPaise * coupon.discountValue) / 100)
      : coupon.discountValue;

  // Never discount more than the price, and never below the gateway minimum.
  discount = Math.min(discount, amountPaise - MIN_CHARGE_PAISE);
  if (discount < 0) discount = 0;

  return { discountPaise: discount, finalPaise: amountPaise - discount };
}

export type CouponValidation =
  | { ok: true; coupon: Coupon; pricing: CouponPricing }
  | { ok: false; reason: string };

/**
 * Server-side validation of a coupon for a specific user + plan. This is the
 * single source of truth used by both the preview endpoint and create-order,
 * so a tampered client can never smuggle an invalid or over-limit discount
 * through to the Razorpay order amount.
 */
export async function validateCoupon(params: {
  code: string;
  plan: Pick<PlanConfig, "code" | "amountPaise" | "isTrial">;
  userId: string;
}): Promise<CouponValidation> {
  const code = params.code.trim().toUpperCase();
  if (!code) return { ok: false, reason: "Enter a coupon code" };

  if (params.plan.isTrial || params.plan.amountPaise <= 0) {
    return { ok: false, reason: "Coupons don’t apply to this plan" };
  }

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) return { ok: false, reason: "This coupon is not valid" };

  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "This coupon has expired" };
  }
  if (coupon.planCodes.length > 0 && !coupon.planCodes.includes(params.plan.code)) {
    return { ok: false, reason: "This coupon isn’t valid for the selected plan" };
  }
  if (params.plan.amountPaise < coupon.minAmountPaise) {
    return { ok: false, reason: "Order value is below this coupon’s minimum" };
  }
  if (coupon.maxRedemptions != null && coupon.timesRedeemed >= coupon.maxRedemptions) {
    return { ok: false, reason: "This coupon has reached its usage limit" };
  }

  const userUses = await prisma.couponRedemption.count({
    where: { couponId: coupon.id, userId: params.userId }
  });
  if (userUses >= coupon.perUserLimit) {
    return { ok: false, reason: "You have already used this coupon" };
  }

  const pricing = computeCouponPricing(coupon, params.plan.amountPaise);
  if (pricing.discountPaise <= 0) {
    return { ok: false, reason: "This coupon gives no discount on the selected plan" };
  }

  return { ok: true, coupon, pricing };
}

/**
 * Records a coupon redemption for a captured payment and bumps the coupon's
 * counter. Idempotent via the unique paymentId — safe to call from both the
 * verify endpoint and the webhook. Must run inside the grant transaction.
 */
export async function recordCouponRedemption(
  tx: TxClient,
  params: { couponCode: string; userId: string; paymentId: string; discountPaise: number }
): Promise<void> {
  const code = params.couponCode.trim().toUpperCase();
  const coupon = await tx.coupon.findUnique({ where: { code }, select: { id: true } });
  if (!coupon) return;

  const existing = await tx.couponRedemption.findUnique({
    where: { paymentId: params.paymentId },
    select: { id: true }
  });
  if (existing) return; // already recorded — idempotent no-op

  await tx.couponRedemption.create({
    data: {
      couponId: coupon.id,
      userId: params.userId,
      paymentId: params.paymentId,
      amountDiscountedPaise: params.discountPaise
    }
  });
  await tx.coupon.update({
    where: { id: coupon.id },
    data: { timesRedeemed: { increment: 1 } }
  });
}
