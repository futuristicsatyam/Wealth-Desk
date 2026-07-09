import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/stat-card";
import { TradeHistoryTable } from "@/components/trade-history-table";
import { buildTradeRows, isTargetStatus, type TradeWithIndex } from "@/lib/trade-history";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Performance",
  description: "Transparent, aggregate closed-trade performance from Wealth Research Desk."
};

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const closed = (await prisma.trade.findMany({
    where: { status: { not: "ACTIVE" } },
    orderBy: { closedAt: "desc" },
    take: 80,
    include: { index: { select: { lotSize: true } } }
  })) as TradeWithIndex[];

  const total = closed.length;
  const wins = closed.filter((t) => isTargetStatus(t.status)).length;
  const losses = closed.filter((t) => t.status === "STOP_LOSS_HIT").length;
  // Hit rate = targets vs DECIDED setups (target or stop-loss). Manually-closed
  // trades are neither a win nor a loss, so they're excluded from the denominator
  // — this keeps the figure identical to the member Trade History page.
  const scored = wins + losses;
  const winRate = scored > 0 ? Math.round((wins / scored) * 100) : 0;

  return (
    <main className="container-page py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Performance</p>
      <h1 className="mt-3 text-4xl font-semibold">Honest, aggregate transparency</h1>
      <p className="mt-4 max-w-2xl text-sm text-muted">
        We publish our full closed-trade history openly - entries, stop-losses, targets and outcomes.
        Live setups and the research rationale behind each call are available to members.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Closed trades" value={String(total)} hint="Most recent published" />
        <StatCard label="Targets achieved" value={String(wins)} hint="Reached at least Target 1" />
        <StatCard label="Stop-loss hit" value={String(losses)} hint="Invalidation triggered" />
        <StatCard label="Hit rate" value={`${winRate}%`} hint="Targets vs stop-loss outcomes" />
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
        <div className="mt-4">
          <TradeHistoryTable rows={buildTradeRows(closed)} />
        </div>
      )}

      <Card className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Want the research behind these trades?</p>
          <p className="text-sm text-muted">
            Members get live setups, the rationale behind every call, and the daily market outlook.
          </p>
        </div>
        <Link href="/membership">
          <Button>Explore membership</Button>
        </Link>
      </Card>
    </main>
  );
}
