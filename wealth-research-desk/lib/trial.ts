import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { addDays } from "@/lib/date";
import { panRegex, aadhaarRegex } from "@/lib/validations";

const TRIAL_DAYS = 5;

export type TrialEligibility = {
  eligible: boolean;
  reason?: string;
};

/** Determines whether a user can still start a trial. */
export async function getTrialEligibility(userId: string): Promise<TrialEligibility> {
  const [user, paidSub, trialUsage] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { trialConsumed: true, panNumber: true, aadhaarNumber: true }
    }),
    prisma.subscription.findFirst({
      where: { userId, planType: { not: "TRIAL" } },
      select: { id: true }
    }),
    prisma.trialUsage.findUnique({ where: { userId }, select: { id: true } })
  ]);

  if (!user) return { eligible: false, reason: "User not found" };
  if (paidSub) return { eligible: false, reason: "Trial is not available after a paid plan" };
  if (user.trialConsumed || trialUsage) return { eligible: false, reason: "Trial already used" };
  if (!user.panNumber || !user.aadhaarNumber) {
    return { eligible: false, reason: "Complete KYC (PAN + Aadhaar) before starting a trial" };
  }
  return { eligible: true };
}

/** Activates a 5-day trial. Abuse prevention relies on the unique TrialUsage.userId. */
export async function activateTrial(params: {
  userId: string;
  ipAddress: string;
  deviceFingerprint: string;
}): Promise<{ ok: boolean; message?: string }> {
  const eligibility = await getTrialEligibility(params.userId);
  if (!eligibility.eligible) {
    return { ok: false, message: eligibility.reason };
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { panNumber: true, aadhaarNumber: true }
  });
  if (!user?.panNumber || !user.aadhaarNumber) {
    return { ok: false, message: "KYC details are required" };
  }
  if (!panRegex.test(user.panNumber) || !aadhaarRegex.test(user.aadhaarNumber)) {
    return { ok: false, message: "Stored KYC details are invalid - contact support" };
  }

  const ipHash = crypto.createHash("sha256").update(params.ipAddress).digest("hex");
  const startedAt = new Date();
  const expiresAt = addDays(startedAt, TRIAL_DAYS);

  try {
    await prisma.$transaction([
      prisma.trialUsage.create({
        data: {
          userId: params.userId,
          startedAt,
          expiresAt,
          ipHash,
          deviceFingerprint: params.deviceFingerprint.slice(0, 400)
        }
      }),
      prisma.user.update({ where: { id: params.userId }, data: { trialConsumed: true } }),
      prisma.subscription.create({
        data: {
          userId: params.userId,
          planType: "TRIAL",
          planCode: "TRIAL",
          planName: "5-Day Trial",
          status: "ACTIVE",
          amountPaise: 0,
          startDate: startedAt,
          endDate: expiresAt
        }
      })
    ]);
    return { ok: true };
  } catch {
    return { ok: false, message: "Trial could not be activated" };
  }
}
