import { prisma } from "@/lib/prisma";
import type { PlanView } from "@/components/pricing-table";

/** Fallback trial parameters used only when no active trial plan is configured. */
export const TRIAL_FALLBACK = { days: 5, name: "5-Day Trial", code: "TRIAL", amountPaise: 0 } as const;

export type TrialPlanInfo = { days: number; name: string; code: string; amountPaise: number };

/**
 * Single source of truth for the trial plan's parameters (duration, name, code,
 * price) — read from the configured trial PlanConfig so every "N-day trial"
 * label and the activation itself stay in sync. Falls back to TRIAL_FALLBACK
 * when no active trial plan exists.
 */
export async function getTrialPlanInfo(): Promise<TrialPlanInfo> {
  const plan = await prisma.planConfig.findFirst({
    where: { isTrial: true, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { code: true, name: true, durationDays: true, amountPaise: true }
  });
  if (!plan) return { ...TRIAL_FALLBACK };
  return { days: plan.durationDays, name: plan.name, code: plan.code, amountPaise: plan.amountPaise };
}

/** Loads active subscription plans for rendering in pricing tables. */
export async function getActivePlans(): Promise<PlanView[]> {
  const plans = await prisma.planConfig.findMany({
    // Private/special plans are intentionally excluded from public pricing;
    // they are reachable only through their secret access link.
    where: { isActive: true, isPrivate: false },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });

  return plans.map((plan) => ({
    code: plan.code,
    name: plan.name,
    description: plan.description,
    amountPaise: plan.amountPaise,
    durationDays: plan.durationDays,
    referralBonusDays: plan.referralBonusDays,
    isTrial: plan.isTrial,
    features: plan.features
  }));
}
