import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PricingTable } from "@/components/pricing-table";
import { requireUser } from "@/lib/session";
import { getEntitlement } from "@/lib/subscription";
import { getActivePlans } from "@/lib/plans";
import { getTrialEligibility } from "@/lib/trial";
import { prisma } from "@/lib/prisma";
import { formatDate, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const user = await requireUser();
  const [entitlement, plans, trialEligibility, history] = await Promise.all([
    getEntitlement(user.id),
    getActivePlans(),
    getTrialEligibility(user.id),
    prisma.subscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  const hasKyc = Boolean(user.panNumber && user.aadhaarNumber);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Subscription</h1>
        <p className="mt-1 text-sm text-muted">Manage your access to research.</p>
      </div>

      <Card className="space-y-2">
        <CardTitle>Current status</CardTitle>
        {entitlement.active ? (
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="success">Active</Badge>
            <span className="text-sm">{entitlement.planName}</span>
            {entitlement.endDate && (
              <span className="text-sm text-muted">
                Valid until {formatDate(entitlement.endDate)}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">You do not have an active subscription.</p>
        )}
      </Card>

      <div>
        <h2 className="text-lg font-semibold">Available plans</h2>
        <p className="mt-1 text-xs text-muted">
          {trialEligibility.eligible
            ? "You are eligible for the one-time 5-day trial."
            : `Trial: ${trialEligibility.reason ?? "unavailable"}.`}
        </p>
        <div className="mt-4">
          <PricingTable
            plans={plans}
            context="member"
            isAuthenticated
            trialEligible={trialEligibility.eligible}
            hasKyc={hasKyc}
          />
        </div>
      </div>

      <Card className="space-y-3">
        <CardTitle>Subscription history</CardTitle>
        {history.length === 0 ? (
          <p className="text-sm text-muted">No subscription history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-2 text-left">Plan</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Start</th>
                  <th className="py-2 text-left">End</th>
                </tr>
              </thead>
              <tbody>
                {history.map((sub) => (
                  <tr key={sub.id} className="border-t border-border">
                    <td className="py-2.5">{sub.planName}</td>
                    <td className="py-2.5">
                      <Badge
                        tone={
                          sub.status === "ACTIVE"
                            ? "success"
                            : sub.status === "EXPIRED" || sub.status === "CANCELLED"
                              ? "neutral"
                              : "warning"
                        }
                      >
                        {titleCase(sub.status)}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-muted">{formatDate(sub.startDate)}</td>
                    <td className="py-2.5 text-muted">{formatDate(sub.endDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
