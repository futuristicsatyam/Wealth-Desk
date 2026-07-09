import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/stat-card";
import { TradeHistoryTable } from "@/components/trade-history-table";
import { buildTradeRows, isTargetStatus, type TradeWithIndex } from "@/lib/trade-history";
import { requireUser } from "@/lib/session";
import { getEntitlement } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requireUser();
  // History is open to all signed-in users (including non-plan). Trial members
  // still see only trial-visible trades; everyone else sees the full history.
  const entitlement = await getEntitlement(user.id);

  const trades = (await prisma.trade.findMany({
    where: {
      status: { not: "ACTIVE" },
      ...(entitlement.trialVisibleOnly ? { isTrialVisible: true } : {})
    },
    orderBy: { closedAt: "desc" },
    take: 80,
    include: { index: { select: { lotSize: true } } }
  })) as TradeWithIndex[];

  const wins = trades.filter((t) => isTargetStatus(t.status)).length;
  const losses = trades.filter((t) => t.status === "STOP_LOSS_HIT").length;
  const scoredTrades = wins + losses;
  const hitRate = scoredTrades > 0 ? Math.round((wins / scoredTrades) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trade History</h1>
        <p className="mt-1 text-sm text-muted">Closed setups with documented outcomes.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Closed" value={String(trades.length)} />
        <StatCard label="Targets hit" value={String(wins)} />
        <StatCard label="Stop-loss" value={String(losses)} />
        <StatCard label="Hit rate" value={`${hitRate}%`} />
      </div>

      {trades.length === 0 ? (
        <EmptyState title="No closed trades yet" />
      ) : (
        <TradeHistoryTable rows={buildTradeRows(trades)} />
      )}
    </div>
  );
}
