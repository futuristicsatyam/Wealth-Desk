import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { PageBanner } from "@/components/ui/page-banner";
import { requireUser } from "@/lib/session";
import { getEntitlement } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardHome({
  searchParams
}: {
  searchParams: Promise<{ kyc?: string }>;
}) {
  const { kyc } = await searchParams;
  const user = await requireUser();
  const entitlement = await getEntitlement(user.id);

  const [activeTrades, unread, recentNotifications] = await Promise.all([
    prisma.trade.count({ where: { status: "ACTIVE" } }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4
    })
  ]);

  const hasKyc = Boolean(user.panNumber && user.aadhaarNumber);

  return (
    <div className="space-y-6">
      {kyc === "required" && (
        <PageBanner tone="warning" message="Complete your KYC details before purchasing a plan." />
      )}

      <div>
        <h1 className="text-2xl font-semibold">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted">Here is your research desk at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Membership"
          value={entitlement.active ? (entitlement.planName ?? "Active") : "None"}
          hint={
            entitlement.endDate
              ? `Valid until ${formatDate(entitlement.endDate)}`
              : "No active subscription"
          }
        />
        <StatCard label="Live setups" value={String(activeTrades)} hint="Currently open" />
        <StatCard label="Unread alerts" value={String(unread)} hint="In your notifications" />
      </div>

      {!entitlement.active && (
        <Card className="flex flex-col items-start gap-3 border-accent/30 bg-accent/5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Activate your access</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Start the one-time 5-day trial or choose a paid plan to unlock research.
            </p>
          </div>
          <Link href="/dashboard/subscription">
            <Button>View plans</Button>
          </Link>
        </Card>
      )}

      {entitlement.isTrial && (
        <PageBanner
          tone="info"
          message="You are on the trial plan - a limited selection of trades is visible. Upgrade for full access."
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle>Recent notifications</CardTitle>
            <Link href="/dashboard/notifications" className="text-xs text-accent">
              View all
            </Link>
          </div>
          {recentNotifications.length === 0 ? (
            <p className="text-sm text-muted">No notifications yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentNotifications.map((n) => (
                <li key={n.id} className="rounded-lg border border-border bg-surface px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.isRead && <Badge tone="accent">New</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{n.body}</p>
                  <p className="mt-1 text-[10px] text-muted">{formatDateTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3">
          <CardTitle>Quick links</CardTitle>
          <div className="grid gap-2">
            {[
              ["View active trades", "/dashboard/trades"],
              ["Today's market outlook", "/dashboard/outlook"],
              ["Manage subscription", "/dashboard/subscription"],
              ["Raise a support ticket", "/dashboard/support"]
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5 text-sm hover:border-accent/40"
              >
                {label}
                <ArrowUpRight size={15} className="text-muted" />
              </Link>
            ))}
          </div>
          {!hasKyc && (
            <p className="text-xs text-warning">
              KYC incomplete - PAN/Aadhaar are required for trial eligibility.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
