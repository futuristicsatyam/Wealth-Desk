import type { SubscriptionPlanType } from "@prisma/client";

/**
 * Referral programme rules.
 *
 * A referrer earns free subscription time when a user they referred completes a
 * *paid* subscription. The reward is granted once per referred user (enforced by
 * the unique ReferralReward.referredUserId), inside the same transaction that
 * activates the referred user's subscription - see grantSubscriptionFromPayment.
 */

/** Free days the referrer earns when a referred user buys a given plan. */
export function referralBonusDaysForPlan(planType: SubscriptionPlanType): number {
  switch (planType) {
    case "MONTHLY":
      return 5;
    case "QUARTERLY":
      return 15;
    case "ANNUAL":
      return 30;
    default:
      // TRIAL (or anything unexpected) earns nothing.
      return 0;
  }
}

/** Human-readable label for a bonus-day count, e.g. "5 days" or "1 month". */
export function referralBonusLabel(bonusDays: number): string {
  if (bonusDays <= 0) return "no";
  if (bonusDays % 30 === 0) {
    const months = bonusDays / 30;
    return months === 1 ? "1 month" : `${months} months`;
  }
  return bonusDays === 1 ? "1 day" : `${bonusDays} days`;
}

/**
 * Generates a candidate referral code seeded from the user's name. The caller is
 * responsible for checking uniqueness (and retrying) since the random suffix can
 * collide - the User.referralCode column is unique.
 */
export function createReferralCodeSeed(name: string): string {
  const prefix = (name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}${suffix}`;
}
