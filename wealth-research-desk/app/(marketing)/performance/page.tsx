import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Performance",
  description: "Transparent, aggregate closed-trade performance from Wealth Research Desk."
};

export const dynamic = "force-dynamic";

const TARGET_STATUSES = ["TARGET1_HIT", "TARGET2_HIT", "TARGET3_HIT"] as const;

export default async function PerformancePage() {
  // Public page: only AGGREGATE outcomes are exposed. Entry / stop-loss /
  // target prices and rationale stay behind the member paywall.
  const closed = await prisma.trade.findMany({
    where: { status: { not: "ACTIVE" } },
    orderBy: { closedAt: "desc" },
    select: {
      id: true,
      instrument: true,
      segment: true,
      tradeType: true,
      status: true,
      closedAt: true,
      postedAt: true
    },
    take: 60
  });

  const total = closed.length;
  const wins = closed.filter((t) => TARGET_STATUSES.includes(t.status as never)).length;
  const losses = closed.filter((t) => t.status === "STOP_LOSS_HIT").length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  return (
    <main className="container-page py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Performance</p>
      <h1 className="mt-3 text-4xl font-semibold">Honest, aggregate transparency</h1>
      <p className="mt-4 max-w-2xl text-sm text-muted">
        We publish closed-trade outcomes openly. Figures below are calculated from the most recent
        closed setups. Detailed entries, stop-losses, targets and rationale are available to members.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Closed trades" value={String(total)} hint="Most recent published" />
        <StatCard label="Targets achieved" value={String(wins)} hint="Reached at least Target 1" />
        <StatCard label="Stop-loss hit" value={String(losses)} hint="Invalidation triggered" />
        <StatCard label="Hit rate" value={`${winRate}%`} hint="Targets vs closed trades" />
      </div>

      <div className="mt-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
        Hit rate measures how often a published setup reached a target before its stop-loss. It is not
        a measure of returns and is not indicative of future results.
      </div>

      <h2 className="mt-12 text-2xl font-semibold">Recent closed setups</h2>
      {total === 0 ? (
        <Card className="mt-4">
          <p className="text-sm text-muted">No closed trades have been published yet.</p>
        </Card>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl2 border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 text-left">Instrument</th>
                <th className="px-4 py-3 text-left">Segment</th>
                <th className="px-4 py-3 text-left">Direction</th>
                <th className="px-4 py-3 text-left">Outcome</th>
                <th className="px-4 py-3 text-left">Closed</th>
              </tr>
            </thead>
            <tbody>
              {closed.map((trade) => {
                const isWin = TARGET_STATUSES.includes(trade.status as never);
                return (
                  <tr key={trade.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{trade.instrument}</td>
                    <td className="px-4 py-3 text-muted">{trade.segment}</td>
                    <td className="px-4 py-3">
                      <Badge tone={trade.tradeType === "BUY" ? "success" : "danger"}>
                        {trade.tradeType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={isWin ? "success" : trade.status === "STOP_LOSS_HIT" ? "danger" : "neutral"}>
                        {isWin ? "Target achieved" : trade.status === "STOP_LOSS_HIT" ? "Stop-loss" : "Closed"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {trade.closedAt ? formatDate(trade.closedAt) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Card className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Want the full research detail?</p>
          <p className="text-sm text-muted">Members see entries, stop-losses, targets and rationale.</p>
        </div>
        <Link href="/membership">
          <Button>Explore membership</Button>
        </Link>
      </Card>
    </main>
  );
}
