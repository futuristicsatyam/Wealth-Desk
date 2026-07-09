import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { AnalyticsFilters } from "@/components/admin/analytics-filters";
import { AnalyticsTrends, type TrendPoint } from "@/components/admin/analytics-trends";
import { prisma } from "@/lib/prisma";
import { expireOverdueSubscriptions } from "@/lib/subscription";
import { formatInr, titleCase } from "@/lib/format";
import { addDays, startOfDayUtc } from "@/lib/date";

export const dynamic = "force-dynamic";

type RangeKey = "7d" | "30d" | "90d" | "12m" | "all";
const RANGE_KEYS: RangeKey[] = ["7d", "30d", "90d", "12m", "all"];
// Defined server-side (must NOT be imported from the "use client" filter module,
// or it becomes a client-reference proxy that throws when used on the server).
const DEFAULT_RANGE: RangeKey = "30d";

type Granularity = "day" | "week" | "month";

function resolveRange(raw: string | undefined): RangeKey {
  return RANGE_KEYS.includes(raw as RangeKey) ? (raw as RangeKey) : (DEFAULT_RANGE as RangeKey);
}

/** Start date for time-scoped KPIs. `all` returns null (no lower bound). */
function rangeStart(range: RangeKey, now: Date): Date | null {
  switch (range) {
    case "7d":
      return addDays(now, -7);
    case "30d":
      return addDays(now, -30);
    case "90d":
      return addDays(now, -90);
    case "12m":
      return addDays(now, -365);
    case "all":
      return null;
  }
}

function granularityFor(range: RangeKey): Granularity {
  if (range === "7d" || range === "30d") return "day";
  if (range === "90d") return "week";
  return "month";
}

const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  "12m": "last 12 months",
  all: "all time"
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Build ordered, zero-filled time buckets and index records into them. */
function buildBuckets(start: Date, end: Date, gran: Granularity) {
  const buckets: { start: Date; label: string }[] = [];
  if (gran === "month") {
    let y = start.getUTCFullYear();
    let m = start.getUTCMonth();
    const ey = end.getUTCFullYear();
    const em = end.getUTCMonth();
    while (y < ey || (y === ey && m <= em)) {
      buckets.push({ start: new Date(Date.UTC(y, m, 1)), label: `${MONTHS[m]} ${String(y).slice(2)}` });
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
  } else {
    const step = gran === "week" ? 7 : 1;
    let cur = startOfDayUtc(start);
    const endDay = startOfDayUtc(end);
    while (cur.getTime() <= endDay.getTime()) {
      const label =
        gran === "week"
          ? `${cur.getUTCDate()} ${MONTHS[cur.getUTCMonth()]}`
          : `${cur.getUTCDate()} ${MONTHS[cur.getUTCMonth()]}`;
      buckets.push({ start: cur, label });
      cur = addDays(cur, step);
    }
  }
  return buckets;
}

function bucketIndex(date: Date, buckets: { start: Date }[], gran: Granularity): number {
  if (gran === "month") {
    return buckets.findIndex(
      (b) => b.start.getUTCFullYear() === date.getUTCFullYear() && b.start.getUTCMonth() === date.getUTCMonth()
    );
  }
  const step = gran === "week" ? 7 : 1;
  const first = buckets[0]?.start;
  if (!first) return -1;
  const day = startOfDayUtc(date).getTime();
  const idx = Math.floor((day - first.getTime()) / (step * 86_400_000));
  return idx >= 0 && idx < buckets.length ? idx : -1;
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

/** Pure-CSS horizontal distribution bar (no client JS — CSP-safe). */
function DistroBar({
  label,
  value,
  max,
  tone = "accent",
  suffix
}: {
  label: string;
  value: number;
  max: number;
  tone?: "accent" | "positive" | "negative" | "warning" | "muted";
  suffix?: string;
}) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  const toneClass = {
    accent: "bg-accent",
    positive: "bg-positive",
    negative: "bg-negative",
    warning: "bg-warning",
    muted: "bg-muted"
  }[tone];
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-medium tabular-nums">
          {value.toLocaleString("en-IN")}
          {suffix ? <span className="ml-1 text-xs text-muted">{suffix}</span> : null}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div className={`h-full rounded-full ${toneClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default async function AdminAnalyticsPage({
  searchParams
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeRaw } = await searchParams;
  const range = resolveRange(rangeRaw);
  const now = new Date();
  // Self-heal lapsed ACTIVE rows so the status breakdown counts them correctly.
  await expireOverdueSubscriptions();
  const start = rangeStart(range, now);
  const gran = granularityFor(range);

  // Time-scoped WHERE fragment (applies to "created in period" metrics).
  const inRange = start ? { gte: start } : undefined;
  const soon = addDays(now, 7);

  const [
    totalUsers,
    newUsers,
    activeMemberRows,
    usersByRole,
    bannedUsers,
    emailVerified,
    phoneVerified,
    referredUsers,
    referralRewards,
    activeByPlan,
    subsByStatus,
    newSubs,
    expiringSoon,
    capturedAll,
    capturedInRange,
    gstInRange,
    paymentsByStatus,
    revenueByPlan,
    tradesInRange,
    activeTrades,
    tradesByStatus,
    tradesBySegment,
    trialsInRange,
    trialsTotal,
    trialsConverted,
    ticketsByStatus,
    ticketsByPriority,
    earliestUser,
    signupRows,
    revenueRows
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: inRange ? { createdAt: inRange } : {} }),
    prisma.subscription.groupBy({
      by: ["userId"],
      where: { status: "ACTIVE", endDate: { gte: now } }
    }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
    prisma.user.count({ where: { phoneVerifiedAt: { not: null } } }),
    prisma.user.count({ where: { referredByUserId: { not: null } } }),
    prisma.referralReward.aggregate({
      where: inRange ? { createdAt: inRange } : {},
      _count: true,
      _sum: { bonusDays: true }
    }),
    prisma.subscription.groupBy({
      by: ["planType"],
      where: { status: "ACTIVE", endDate: { gte: now } },
      _count: { _all: true }
    }),
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.subscription.count({ where: inRange ? { createdAt: inRange } : {} }),
    prisma.subscription.count({ where: { status: "ACTIVE", endDate: { gte: now, lte: soon } } }),
    prisma.payment.aggregate({ where: { status: "CAPTURED" }, _sum: { amountPaise: true }, _count: true }),
    prisma.payment.aggregate({
      where: { status: "CAPTURED", ...(inRange ? { createdAt: inRange } : {}) },
      _sum: { amountPaise: true },
      _count: true
    }),
    prisma.payment.aggregate({
      where: { status: "CAPTURED", ...(inRange ? { createdAt: inRange } : {}) },
      _sum: { gstAmountPaise: true }
    }),
    prisma.payment.groupBy({
      by: ["status"],
      where: inRange ? { createdAt: inRange } : {},
      _count: { _all: true }
    }),
    prisma.payment.groupBy({
      by: ["planType"],
      where: { status: "CAPTURED", ...(inRange ? { createdAt: inRange } : {}) },
      _sum: { amountPaise: true }
    }),
    prisma.trade.count({ where: inRange ? { postedAt: inRange } : {} }),
    prisma.trade.count({ where: { status: "ACTIVE" } }),
    prisma.trade.groupBy({
      by: ["status"],
      where: inRange ? { postedAt: inRange } : {},
      _count: { _all: true }
    }),
    prisma.trade.groupBy({
      by: ["segment"],
      where: inRange ? { postedAt: inRange } : {},
      _count: { _all: true }
    }),
    prisma.trialUsage.count({ where: inRange ? { createdAt: inRange } : {} }),
    prisma.trialUsage.count(),
    prisma.user.count({ where: { trialConsumed: true, subscriptions: { some: { planType: { not: "TRIAL" } } } } }),
    prisma.supportTicket.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.supportTicket.groupBy({ by: ["priority"], _count: { _all: true } }),
    prisma.user.aggregate({ _min: { createdAt: true } }),
    prisma.user.findMany({
      where: inRange ? { createdAt: inRange } : {},
      select: { createdAt: true }
    }),
    prisma.payment.findMany({
      where: { status: "CAPTURED", ...(inRange ? { createdAt: inRange } : {}) },
      select: { createdAt: true, amountPaise: true }
    })
  ]);

  // ---- Derived figures ----
  const activeMembers = activeMemberRows.length;
  const revenueAllPaise = capturedAll._sum.amountPaise ?? 0;
  const revenueRangePaise = capturedInRange._sum.amountPaise ?? 0;
  const gstRangePaise = gstInRange._sum.gstAmountPaise ?? 0;
  const arpuPaise = activeMembers > 0 ? Math.round(revenueAllPaise / activeMembers) : 0;

  const paymentAttempts = paymentsByStatus.reduce((s, r) => s + r._count._all, 0);
  const capturedCount = paymentsByStatus.find((r) => r.status === "CAPTURED")?._count._all ?? 0;
  const successRate = pct(capturedCount, paymentAttempts);

  const roleMap = Object.fromEntries(usersByRole.map((r) => [r.role, r._count._all]));
  const subStatusMap = Object.fromEntries(subsByStatus.map((r) => [r.status, r._count._all]));

  const closedStatuses = ["CLOSED", "TARGET1_HIT", "TARGET2_HIT", "TARGET3_HIT", "STOP_LOSS_HIT"];
  const tradeStatusMap = Object.fromEntries(tradesByStatus.map((r) => [r.status, r._count._all]));
  const targetsHit =
    (tradeStatusMap.TARGET1_HIT ?? 0) + (tradeStatusMap.TARGET2_HIT ?? 0) + (tradeStatusMap.TARGET3_HIT ?? 0);
  const decided = targetsHit + (tradeStatusMap.STOP_LOSS_HIT ?? 0);
  const winRate = pct(targetsHit, decided);
  const totalClosed = closedStatuses.reduce((s, k) => s + (tradeStatusMap[k] ?? 0), 0);

  const trialConversion = pct(trialsConverted, trialsTotal);

  const openTickets =
    (ticketsByStatus.find((r) => r.status === "OPEN")?._count._all ?? 0) +
    (ticketsByStatus.find((r) => r.status === "IN_PROGRESS")?._count._all ?? 0);

  // ---- Time-series buckets ----
  const chartStart = start ?? earliestUser._min.createdAt ?? addDays(now, -365);
  const buckets = buildBuckets(chartStart, now, gran);
  const trend: TrendPoint[] = buckets.map((b) => ({ label: b.label, signups: 0, revenuePaise: 0 }));
  for (const row of signupRows) {
    const i = bucketIndex(row.createdAt, buckets, gran);
    if (i >= 0) trend[i].signups += 1;
  }
  for (const row of revenueRows) {
    const i = bucketIndex(row.createdAt, buckets, gran);
    if (i >= 0) trend[i].revenuePaise += row.amountPaise;
  }

  const activePlanMax = Math.max(1, ...activeByPlan.map((r) => r._count._all));
  const segmentMax = Math.max(1, ...tradesBySegment.map((r) => r._count._all));
  const revenuePlanMax = Math.max(1, ...revenueByPlan.map((r) => r._sum.amountPaise ?? 0));

  // ---- Private / special plans ----
  const privatePlans = await prisma.planConfig.findMany({
    where: { isPrivate: true },
    orderBy: { createdAt: "desc" }
  });
  const privateCodes = privatePlans.map((p) => p.code);
  let privateRedemptionRows: { planCode: string | null }[] = [];
  let privateRevenuePaise = 0;
  if (privateCodes.length > 0) {
    const [rows, rev] = await Promise.all([
      prisma.payment.groupBy({
        by: ["planCode", "userId"],
        where: { status: "CAPTURED", planCode: { in: privateCodes } }
      }),
      prisma.payment.aggregate({
        where: { status: "CAPTURED", planCode: { in: privateCodes }, ...(inRange ? { createdAt: inRange } : {}) },
        _sum: { amountPaise: true }
      })
    ]);
    privateRedemptionRows = rows;
    privateRevenuePaise = rev._sum.amountPaise ?? 0;
  }
  const redemptionsByCode = new Map<string, number>();
  for (const row of privateRedemptionRows) {
    if (row.planCode) redemptionsByCode.set(row.planCode, (redemptionsByCode.get(row.planCode) ?? 0) + 1);
  }
  const totalPrivateRedemptions = privateRedemptionRows.length;
  const activePrivatePlans = privatePlans.filter((p) => p.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Live platform metrics &middot; time-scoped figures reflect the {RANGE_LABELS[range]}.
          </p>
        </div>
        <AnalyticsFilters current={range} />
      </div>

      {/* Headline KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active members"
          value={activeMembers.toLocaleString("en-IN")}
          hint="Users with a live paid subscription"
        />
        <StatCard
          label="Total users"
          value={totalUsers.toLocaleString("en-IN")}
          hint={`+${newUsers.toLocaleString("en-IN")} in ${RANGE_LABELS[range]}`}
        />
        <StatCard
          label={`Revenue (${RANGE_LABELS[range]})`}
          value={formatInr(revenueRangePaise)}
          hint={`${capturedInRange._count} payments · ${formatInr(revenueAllPaise)} all-time`}
        />
        <StatCard
          label="Payment success"
          value={successRate}
          hint={`${capturedCount}/${paymentAttempts} attempts captured`}
        />
      </div>

      {/* Trends */}
      <AnalyticsTrends data={trend} />

      {/* Users + Subscriptions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <CardTitle>Users</CardTitle>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Members" value={roleMap.USER ?? 0} />
            <Metric label="Analysts" value={roleMap.ANALYST ?? 0} />
            <Metric label="Email verified" value={emailVerified} sub={pct(emailVerified, totalUsers)} />
            <Metric label="Phone verified" value={phoneVerified} sub={pct(phoneVerified, totalUsers)} />
            <Metric label="Referred signups" value={referredUsers} sub={pct(referredUsers, totalUsers)} />
            <Metric label="Banned" value={bannedUsers} tone={bannedUsers > 0 ? "negative" : "muted"} />
          </div>
          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
            Referral rewards granted ({RANGE_LABELS[range]}):{" "}
            <span className="font-medium text-foreground">{referralRewards._count}</span> ·{" "}
            <span className="font-medium text-foreground">{referralRewards._sum.bonusDays ?? 0}</span> bonus days
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Subscriptions</CardTitle>
            {expiringSoon > 0 ? (
              <Badge tone="warning">{expiringSoon} expiring ≤7d</Badge>
            ) : (
              <Badge tone="success">None expiring soon</Badge>
            )}
          </div>
          {activeByPlan.length === 0 ? (
            <p className="text-sm text-muted">No active subscriptions.</p>
          ) : (
            <div className="space-y-2.5">
              {activeByPlan
                .slice()
                .sort((a, b) => b._count._all - a._count._all)
                .map((r) => (
                  <DistroBar
                    key={r.planType}
                    label={titleCase(r.planType)}
                    value={r._count._all}
                    max={activePlanMax}
                  />
                ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm sm:grid-cols-4">
            <Metric label="Active" value={subStatusMap.ACTIVE ?? 0} tone="positive" />
            <Metric label="Pending" value={subStatusMap.PENDING ?? 0} />
            <Metric label="Expired" value={subStatusMap.EXPIRED ?? 0} tone="muted" />
            <Metric label="New in period" value={newSubs} />
          </div>
        </Card>
      </div>

      {/* Revenue + Trades */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <CardTitle>Revenue by plan ({RANGE_LABELS[range]})</CardTitle>
          {revenueByPlan.every((r) => (r._sum.amountPaise ?? 0) === 0) ? (
            <p className="text-sm text-muted">No captured revenue in this period.</p>
          ) : (
            <div className="space-y-2.5">
              {revenueByPlan
                .slice()
                .sort((a, b) => (b._sum.amountPaise ?? 0) - (a._sum.amountPaise ?? 0))
                .map((r) => (
                  <DistroBar
                    key={String(r.planType)}
                    label={r.planType ? titleCase(r.planType) : "Unattributed"}
                    value={r._sum.amountPaise ?? 0}
                    max={revenuePlanMax}
                    tone="positive"
                    suffix={formatInr(r._sum.amountPaise ?? 0)}
                  />
                ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
            <Metric label="GST collected" value={formatInr(gstRangePaise)} raw />
            <Metric label="ARPU (all-time)" value={formatInr(arpuPaise)} raw />
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Trades ({RANGE_LABELS[range]})</CardTitle>
            <Badge tone="accent">{activeTrades} live</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Metric label="Posted" value={tradesInRange} />
            <Metric label="Closed" value={totalClosed} tone="muted" />
            <Metric label="Win rate" value={winRate} raw tone="positive" sub={`${targetsHit}/${decided} decided`} />
          </div>
          {tradesBySegment.length > 0 && (
            <div className="space-y-2.5 border-t border-border pt-3">
              <p className="text-xs uppercase tracking-wider text-muted">By segment</p>
              {tradesBySegment
                .slice()
                .sort((a, b) => b._count._all - a._count._all)
                .slice(0, 5)
                .map((r) => (
                  <DistroBar key={r.segment} label={r.segment} value={r._count._all} max={segmentMax} />
                ))}
            </div>
          )}
        </Card>
      </div>

      {/* Special / private plans */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle>Special / private plans</CardTitle>
          <Link href="/admin/plans" className="text-xs text-accent">
            Manage plans →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Metric label="Private plans" value={privatePlans.length} />
          <Metric label="Active" value={activePrivatePlans} tone="positive" />
          <Metric label="Total redemptions" value={totalPrivateRedemptions} />
          <Metric label={`Revenue (${range})`} value={formatInr(privateRevenuePaise)} raw tone="positive" />
        </div>
        {privatePlans.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface px-3 py-4 text-center text-sm text-muted">
            No special plans yet. Create one in{" "}
            <Link href="/admin/plans" className="text-accent">
              Plans
            </Link>{" "}
            by ticking “Private / special plan” — it gets a shareable access link and appears here for
            tracking.
          </div>
        ) : (
          <div className="space-y-2 border-t border-border pt-3">
            {privatePlans.map((p) => {
              const redeemed = redemptionsByCode.get(p.code) ?? 0;
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    <Badge tone="neutral">{p.code}</Badge>
                    {p.amountPaise <= 0 ? (
                      <Badge tone="success">Free</Badge>
                    ) : (
                      <Badge tone="accent">{formatInr(p.amountPaise)}</Badge>
                    )}
                    {!p.isActive && <Badge tone="neutral">Hidden</Badge>}
                  </div>
                  <span className="tabular-nums text-muted">
                    {redeemed}
                    {p.maxRedemptions != null ? `/${p.maxRedemptions}` : ""} redeemed
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Trials + Support */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <CardTitle>Trials</CardTitle>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Metric label="Started in period" value={trialsInRange} />
            <Metric label="Total ever" value={trialsTotal} tone="muted" />
            <Metric label="→ Paid" value={trialConversion} raw tone="positive" sub={`${trialsConverted} converted`} />
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Support</CardTitle>
            <Link href="/admin/support" className="text-xs text-accent">
              Open queue →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((s) => (
              <Metric
                key={s}
                label={titleCase(s)}
                value={ticketsByStatus.find((r) => r.status === s)?._count._all ?? 0}
                tone={s === "OPEN" ? "negative" : s === "IN_PROGRESS" ? "warning" : "muted"}
              />
            ))}
          </div>
          {ticketsByPriority.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {ticketsByPriority.map((r) => (
                <Badge key={r.priority} tone="neutral">
                  {titleCase(r.priority)}: {r._count._all}
                </Badge>
              ))}
            </div>
          )}
          {openTickets > 0 && (
            <p className="text-xs text-warning">{openTickets} ticket(s) awaiting response.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  tone = "foreground",
  raw = false
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "foreground" | "positive" | "negative" | "warning" | "muted";
  raw?: boolean;
}) {
  const toneClass = {
    foreground: "text-foreground",
    positive: "text-positive",
    negative: "text-negative",
    warning: "text-warning",
    muted: "text-muted"
  }[tone];
  const display = raw ? value : typeof value === "number" ? value.toLocaleString("en-IN") : value;
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${toneClass}`}>{display}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
}
