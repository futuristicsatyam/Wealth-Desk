import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PlanForm } from "@/components/admin/plan-form";
import { CopyLink } from "@/components/admin/copy-link";
import { prisma } from "@/lib/prisma";
import { formatInr } from "@/lib/format";
import { APP_URL } from "@/lib/env";
import { togglePlanActiveAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const plans = await prisma.planConfig.findMany({ orderBy: { sortOrder: "asc" } });

  // Distinct-member redemption counts for private plans, in one query.
  const privateCodes = plans.filter((p) => p.isPrivate).map((p) => p.code);
  const redemptionRows = privateCodes.length
    ? await prisma.payment.groupBy({
        by: ["planCode", "userId"],
        where: { status: "CAPTURED", planCode: { in: privateCodes } }
      })
    : [];
  const redemptionsByCode = new Map<string, number>();
  for (const row of redemptionRows) {
    if (row.planCode) redemptionsByCode.set(row.planCode, (redemptionsByCode.get(row.planCode) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plans</h1>
        <p className="mt-1 text-sm text-muted">
          Configure membership pricing. Changes appear instantly on the public site. Mark a plan as
          private to hide it from public pricing and share it via a secret access link.
        </p>
      </div>

      <Card>
        <CardTitle>Create a plan</CardTitle>
        <div className="mt-4">
          <PlanForm />
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Configured plans</CardTitle>
        {plans.length === 0 ? (
          <EmptyState title="No plans configured yet" />
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => {
              const redeemed = redemptionsByCode.get(plan.code) ?? 0;
              const accessUrl = plan.accessToken ? `${APP_URL}/plans/${plan.accessToken}` : null;
              return (
                <div key={plan.id} className="rounded-lg border border-border bg-surface">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{plan.name}</p>
                        <Badge tone="neutral">{plan.code}</Badge>
                        {plan.isTrial && <Badge tone="accent">Trial</Badge>}
                        {plan.isPrivate && <Badge tone="warning">Private</Badge>}
                        {plan.isPrivate && plan.amountPaise <= 0 && <Badge tone="success">Free</Badge>}
                        <Badge tone={plan.isActive ? "success" : "neutral"}>
                          {plan.isActive ? "Active" : "Hidden"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted">
                        {plan.isTrial || plan.amountPaise <= 0 ? "Free" : formatInr(plan.amountPaise)} &middot;{" "}
                        {plan.durationDays} days &middot; {plan.features.length} features
                        {plan.isPrivate && (
                          <>
                            {" "}
                            &middot; {redeemed}
                            {plan.maxRedemptions != null ? `/${plan.maxRedemptions}` : ""} redeemed
                          </>
                        )}
                      </p>
                    </div>
                    <form action={togglePlanActiveAction}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <Button type="submit" size="sm" variant="secondary">
                        {plan.isActive ? "Hide" : "Show"}
                      </Button>
                    </form>
                  </div>

                  {plan.isPrivate && accessUrl && (
                    <div className="border-t border-border px-3 py-2.5">
                      <p className="mb-1.5 text-xs font-medium text-muted">Access link (share privately)</p>
                      <CopyLink value={accessUrl} />
                    </div>
                  )}

                  <details className="border-t border-border px-3 py-2">
                    <summary className="cursor-pointer select-none text-xs font-medium text-accent">
                      Edit plan
                    </summary>
                    <div className="mt-3">
                      <PlanForm
                        plan={{
                          id: plan.id,
                          code: plan.code,
                          name: plan.name,
                          description: plan.description,
                          amountPaise: plan.amountPaise,
                          durationDays: plan.durationDays,
                          referralBonusDays: plan.referralBonusDays,
                          isTrial: plan.isTrial,
                          isActive: plan.isActive,
                          features: plan.features,
                          sortOrder: plan.sortOrder,
                          isPrivate: plan.isPrivate,
                          maxRedemptions: plan.maxRedemptions
                        }}
                      />
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
