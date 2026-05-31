import { prisma } from "@/lib/prisma";
import type { PlanView } from "@/components/pricing-table";

/** Loads active subscription plans for rendering in pricing tables. */
export async function getActivePlans(): Promise<PlanView[]> {
  const plans = await prisma.planConfig.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });

  return plans.map((plan) => ({
    code: plan.code,
    name: plan.name,
    description: plan.description,
    amountPaise: plan.amountPaise,
    durationDays: plan.durationDays,
    isTrial: plan.isTrial,
    features: plan.features
  }));
}
