import type { Prisma } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/stat-card";
import { SubscriptionsFilter } from "@/components/admin/subscriptions-filter";
import { prisma } from "@/lib/prisma";
import { expireOverdueSubscriptions } from "@/lib/subscription";
import { formatDate, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string; plan?: string }>;
}) {
  const now = new Date();
  // Self-heal lapsed ACTIVE rows so records and counts reflect reality.
  await expireOverdueSubscriptions();

  // Real configured plans drive the plan dropdown, so newly created plans appear
  // automatically instead of a hardcoded list.
  const planConfigs = await prisma.planConfig.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { code: true, name: true }
  });
  const planCodes = new Set(planConfigs.map((p) => p.code));

  const { q: qRaw, status: statusRaw, plan: planRaw } = await searchParams;
  const q = qRaw?.trim() ?? "";
  const status =
    statusRaw && ["active", "expired", "cancelled", "pending"].includes(statusRaw) ? statusRaw : "";
  const plan = planRaw && planCodes.has(planRaw) ? planRaw : "";
  const filtered = Boolean(q || status || plan);

  const statusWhere: Prisma.SubscriptionWhereInput =
    status === "active"
      ? { status: "ACTIVE", endDate: { gte: now } }
      : status === "expired"
        ? { status: "EXPIRED" }
        : status === "cancelled"
          ? { status: "CANCELLED" }
          : status === "pending"
            ? { status: "PENDING" }
            : {};

  const where: Prisma.SubscriptionWhereInput = {
    ...(q
      ? {
          user: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } }
            ]
          }
        }
      : {}),
    ...statusWhere,
    ...(plan ? { planCode: plan } : {})
  };

  const [subscriptions, activeCount, trialCount] = await Promise.all([
    prisma.subscription.findMany({
      where,
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
        <StatCard label={filtered ? "Matching records" : "Total records"} value={`${subscriptions.length}${subscriptions.length === 100 ? "+" : ""}`} />
      </div>

      <SubscriptionsFilter q={q} status={status} plan={plan} plans={planConfigs} />

      <Card className="space-y-3">
        <CardTitle>{filtered ? "Matching subscriptions" : "All subscriptions"}</CardTitle>
        {subscriptions.length === 0 ? (
          <EmptyState
            title={filtered ? "No subscriptions match your filters" : "No subscriptions yet"}
            hint={filtered ? "Try clearing or changing the filters above." : undefined}
          />
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
