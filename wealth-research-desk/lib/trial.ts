import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { addDays } from "@/lib/date";
import { decryptPii } from "@/lib/pii";
import { panRegex, aadhaarRegex } from "@/lib/validations";
import { otpSecret } from "@/lib/phone-otp";
import { getTrialPlanInfo } from "@/lib/plans";

export type TrialEligibility = {
  eligible: boolean;
  reason?: string;
};

// Distinct trials allowed from one network (ipHash). Tolerates a few legitimate
// users behind shared NAT/office IPs while stopping bulk trial farming.
const MAX_TRIALS_PER_IP = 3;

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
  const pan = decryptPii(user?.panNumber);
  const aadhaar = decryptPii(user?.aadhaarNumber);
  if (!pan || !aadhaar) {
    return { ok: false, message: "KYC details are required" };
  }
  if (!panRegex.test(pan) || !aadhaarRegex.test(aadhaar)) {
    return { ok: false, message: "Stored KYC details are invalid - contact support" };
  }

  // Drive the trial's length, name, code and price from the configured trial
  // plan so admin changes take effect (falls back to defaults if none exists).
  const trial = await getTrialPlanInfo();

  // Salted so the stored hash is not reversible via a rainbow table of IPs.
  const ipHash = crypto.createHash("sha256").update(`${otpSecret()}:${params.ipAddress}`).digest("hex");
  const storedFingerprint = params.deviceFingerprint.slice(0, 400);

  // Enforce the abuse signals we record (previously collected but unused): a
  // browser that already ran a trial is refused, and a single network is capped
  // at a handful of trials — so one person can't farm unlimited trials from
  // fresh accounts on one machine. (KYC blind-index uniqueness already blocks
  // reusing the same PAN/Aadhaar; this raises the bar on the remaining vectors.)
  const [deviceUsed, ipCount] = await Promise.all([
    prisma.trialUsage.findFirst({
      where: { deviceFingerprint: storedFingerprint, userId: { not: params.userId } },
      select: { id: true }
    }),
    prisma.trialUsage.count({ where: { ipHash } })
  ]);
  if (deviceUsed) {
    return { ok: false, message: "A free trial has already been used on this device." };
  }
  if (ipCount >= MAX_TRIALS_PER_IP) {
    return { ok: false, message: "The free-trial limit for this network has been reached." };
  }

  const startedAt = new Date();
  const expiresAt = addDays(startedAt, trial.days);

  try {
    await prisma.$transaction([
      prisma.trialUsage.create({
        data: {
          userId: params.userId,
          startedAt,
          expiresAt,
          ipHash,
          deviceFingerprint: storedFingerprint
        }
      }),
      prisma.user.update({ where: { id: params.userId }, data: { trialConsumed: true } }),
      prisma.subscription.create({
        data: {
          userId: params.userId,
          planType: "TRIAL",
          planCode: trial.code,
          planName: trial.name,
          status: "ACTIVE",
          amountPaise: trial.amountPaise,
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
