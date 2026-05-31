import type { Prisma, SubscriptionPlanType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Entitlement = {
  active: boolean;
  isTrial: boolean;
  planType: SubscriptionPlanType | null;
  planName: string | null;
  endDate: Date | null;
  /** True when the user may only see trades flagged isTrialVisible. */
  trialVisibleOnly: boolean;
};

/** Resolves what content a user is entitled to right now. */
export async function getEntitlement(userId: string): Promise<Entitlement> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE", endDate: { gte: new Date() } },
    orderBy: { endDate: "desc" }
  });

  if (!subscription) {
    return { active: false, isTrial: false, planType: null, planName: null, endDate: null, trialVisibleOnly: false };
  }

  const isTrial = subscription.planType === "TRIAL";
  return {
    active: true,
    isTrial,
    planType: subscription.planType,
    planName: subscription.planName,
    endDate: subscription.endDate,
    trialVisibleOnly: isTrial
  };
}

/** Maps a duration to a plan-type enum. */
export function planTypeFromDuration(durationDays: number, isTrial: boolean): SubscriptionPlanType {
  if (isTrial) return "TRIAL";
  if (durationDays <= 31) return "MONTHLY";
  if (durationDays <= 120) return "QUARTERLY";
  return "ANNUAL";
}

export function generateInvoiceNumber(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${y}${m}${d}-${suffix}`;
}

/**
 * Idempotently grants (or extends) a subscription from a paid Payment.
 * Safe to call from BOTH the client-side verify endpoint and the Razorpay
 * webhook - whichever runs second is a no-op.
 */
export async function grantSubscriptionFromPayment(params: {
  paymentId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
}): Promise<{ granted: boolean; reason?: string }> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const payment = await tx.payment.findUnique({ where: { id: params.paymentId } });
    if (!payment) return { granted: false, reason: "payment_not_found" };
    if (!payment.razorpayOrderId) return { granted: false, reason: "missing_order" };

    // Already processed -> idempotent no-op.
    if (payment.status === "CAPTURED") {
      const existing = await tx.subscription.findUnique({
        where: { razorpayOrderId: payment.razorpayOrderId }
      });
      if (existing) return { granted: false, reason: "already_processed" };
    }

    const durationDays = payment.durationDays ?? 30;
    const planType = payment.planType ?? planTypeFromDuration(durationDays, false);
    const now = new Date();
    const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const invoiceNumber = payment.invoiceNumber ?? generateInvoiceNumber(now);
    const gstAmountPaise = payment.gstAmountPaise ?? Math.round(payment.amountPaise * 0.18);

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "CAPTURED",
        razorpayPaymentId: params.razorpayPaymentId,
        razorpaySignature: params.razorpaySignature,
        invoiceNumber,
        gstAmountPaise
      }
    });

    // Supersede previously active subscriptions for this user.
    await tx.subscription.updateMany({
      where: { userId: payment.userId, status: "ACTIVE" },
      data: { status: "CANCELLED", autoRenew: false }
    });

    await tx.subscription.upsert({
      where: { razorpayOrderId: payment.razorpayOrderId },
      update: {
        planType,
        planCode: payment.planCode ?? planType,
        planName: payment.planName ?? planType,
        status: "ACTIVE",
        amountPaise: payment.amountPaise,
        startDate: now,
        endDate
      },
      create: {
        userId: payment.userId,
        planType,
        planCode: payment.planCode ?? planType,
        planName: payment.planName ?? planType,
        status: "ACTIVE",
        amountPaise: payment.amountPaise,
        startDate: now,
        endDate,
        razorpayOrderId: payment.razorpayOrderId
      }
    });

    return { granted: true };
  });
}
