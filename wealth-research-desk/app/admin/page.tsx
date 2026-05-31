import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatInr, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  // Every figure below is a real database aggregate - no placeholders.
  const [
    totalUsers,
    activeSubs,
    activeTrades,
    capturedPayments,
    openTickets,
    recentAudit
  ] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { status: "ACTIVE", endDate: { gte: new Date() } } }),
    prisma.trade.count({ where: { status: "ACTIVE" } }),
    prisma.payment.aggregate({ where: { status: "CAPTURED" }, _sum: { amountPaise: true }, _count: true }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 })
  ]);

  const revenuePaise = capturedPayments._sum.amountPaise ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Operations overview</h1>
        <p className="mt-1 text-sm text-muted">Live platform metrics from the database.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered users" value={String(totalUsers)} />
        <StatCard label="Active subscriptions" value={String(activeSubs)} />
        <StatCard label="Live trades" value={String(activeTrades)} />
        <StatCard
          label="Captured revenue"
          value={formatInr(revenuePaise)}
          hint={`${capturedPayments._count} successful payments`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <CardTitle>Needs attention</CardTitle>
          <Link
            href="/admin/support"
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
          >
            Open support tickets
            <Badge tone={openTickets > 0 ? "warning" : "success"}>{openTickets}</Badge>
          </Link>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Publish a trade", "/admin/trades"],
              ["Post an outlook", "/admin/outlooks"],
              ["Send a broadcast", "/admin/notifications"],
              ["Manage plans", "/admin/plans"]
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border border-border bg-surface px-3 py-2.5 text-center text-sm hover:border-accent/40"
              >
                {label}
              </Link>
            ))}
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle>Recent activity</CardTitle>
            <Link href="/admin/audit" className="text-xs text-accent">
              View audit log
            </Link>
          </div>
          {recentAudit.length === 0 ? (
            <p className="text-sm text-muted">No recorded activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentAudit.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-border bg-surface px-3 py-2">
                  <p className="text-sm">{entry.summary}</p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {entry.actorName} &middot; {formatDateTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
