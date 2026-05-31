import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/stat-card";
import { prisma } from "@/lib/prisma";
import { formatDate, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const now = new Date();
  const [subscriptions, activeCount, trialCount] = await Promise.all([
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true } } }
    }),
    prisma.subscription.count({ where: { status: "ACTIVE", endDate: { gte: now } } }),
    prisma.subscription.count({ where: { planType: "TRIAL" } })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Subscriptions</h1>
          <p className="mt-1 text-sm text-muted">Customer membership records.</p>
        </div>
        <a href="/admin/revenue/export" download>
          <Button variant="secondary" size="sm">Export CSV</Button>
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active now" value={String(activeCount)} />
        <StatCard label="Trials issued" value={String(trialCount)} />
        <StatCard label="Total records" value={String(subscriptions.length)} />
      </div>

      <Card className="space-y-3">
        <CardTitle>All subscriptions</CardTitle>
        {subscriptions.length === 0 ? (
          <EmptyState title="No subscriptions yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-2 text-left">Customer</th>
                  <th className="py-2 text-left">Plan</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Start</th>
                  <th className="py-2 text-left">End</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => {
                  const expired = sub.endDate < now;
                  return (
                    <tr key={sub.id} className="border-t border-border">
                      <td className="py-2.5">
                        <p>{sub.user.name}</p>
                        <p className="text-xs text-muted">{sub.user.email}</p>
                      </td>
                      <td className="py-2.5">
                        {sub.planName}
                        {sub.planType === "TRIAL" && (
                          <Badge tone="accent" className="ml-2">Trial</Badge>
                        )}
                      </td>
                      <td className="py-2.5">
                        <Badge
                          tone={
                            sub.status === "ACTIVE" && !expired
                              ? "success"
                              : expired
                                ? "neutral"
                                : "warning"
                          }
                        >
                          {expired && sub.status === "ACTIVE" ? "Expired" : titleCase(sub.status)}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-muted">{formatDate(sub.startDate)}</td>
                      <td className="py-2.5 text-muted">{formatDate(sub.endDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
