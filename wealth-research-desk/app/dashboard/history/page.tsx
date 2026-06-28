import Link from "next/link";
import type { Trade, TradeStatus } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/stat-card";
import { requireUser } from "@/lib/session";
import { getEntitlement } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { formatDate, tradeStatusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

const TARGET_STATUSES: TradeStatus[] = ["TARGET1_HIT", "TARGET2_HIT", "TARGET3_HIT"];

type TradeWithIndex = Trade & {
  index: { lotSize: number } | null;
};

function isTargetStatus(status: TradeStatus): boolean {
  return TARGET_STATUSES.includes(status);
}

function calculateTradePnl(trade: TradeWithIndex): number | null {
  const entry = Number(trade.entryPrice);

  let exitPrice: number | null = null;
  if (trade.status === "TARGET1_HIT") exitPrice = Number(trade.target1);
  if (trade.status === "TARGET2_HIT") exitPrice = Number(trade.target2);
  if (trade.status === "TARGET3_HIT") exitPrice = trade.target3 ? Number(trade.target3) : Number(trade.target2);
  if (trade.status === "STOP_LOSS_HIT") exitPrice = Number(trade.stopLoss);

  if (exitPrice === null) return null;

  const points = trade.tradeType === "BUY" ? exitPrice - entry : entry - exitPrice;
  const lotSize = trade.index?.lotSize ?? 1;
  return Number((points * lotSize).toFixed(2));
}

function formatPnl(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

export default async function HistoryPage() {
  const user = await requireUser();
  const entitlement = await getEntitlement(user.id);

  if (!entitlement.active) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Trade History</h1>
        <Card className="space-y-3 text-center">
          <p className="text-base font-semibold">Subscription required</p>
          <div>
            <Link href="/dashboard/subscription">
              <Button>View plans</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const trades = (await prisma.trade.findMany({
    where: {
      status: { not: "ACTIVE" },
      ...(entitlement.trialVisibleOnly ? { isTrialVisible: true } : {})
    },
    orderBy: { closedAt: "desc" },
    take: 80,
    include: {
      index: {
        select: { lotSize: true }
      }
    }
  })) as TradeWithIndex[];

  const rows = trades.map((trade) => {
    const closedLabel = trade.closedAt ? formatDate(trade.closedAt) : "-";
    const pnl = calculateTradePnl(trade);
    return { trade, closedLabel, pnl };
  });

  const dayPnlMap = new Map<string, number>();
  for (const row of rows) {
    if (row.closedLabel === "-" || row.pnl === null) continue;
    dayPnlMap.set(row.closedLabel, Number(((dayPnlMap.get(row.closedLabel) ?? 0) + row.pnl).toFixed(2)));
  }

  const groupedRows: Array<{
    dateLabel: string;
    dayPnl: number | null;
    items: typeof rows;
  }> = [];

  for (const row of rows) {
    const previous = groupedRows[groupedRows.length - 1];
    if (!previous || previous.dateLabel !== row.closedLabel) {
      groupedRows.push({
        dateLabel: row.closedLabel,
        dayPnl: row.closedLabel === "-" ? null : dayPnlMap.get(row.closedLabel) ?? null,
        items: [row]
      });
      continue;
    }
    previous.items.push(row);
  }

  const wins = trades.filter((t) => isTargetStatus(t.status)).length;
  const losses = trades.filter((t) => t.status === "STOP_LOSS_HIT").length;
  const scoredTrades = trades.filter(
    (t) => isTargetStatus(t.status) || t.status === "STOP_LOSS_HIT"
  ).length;
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
        <div className="overflow-x-auto rounded-xl2 border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="border-r border-border px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Instrument</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Entry</th>
                <th className="px-4 py-3 text-left">SL</th>
                <th className="px-4 py-3 text-left">Target 1</th>
                <th className="px-4 py-3 text-left">Target 2</th>
                <th className="px-4 py-3 text-left">Target 3</th>
                <th className="border-r border-border px-4 py-3 text-left">Outcome</th>
                <th className="px-4 py-3 text-left">Day P&amp;L (Per Lot)</th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.map((group) =>
                group.items.map(({ trade }, index) => {
                  const isWin = isTargetStatus(trade.status);
                  const showMergedCells = index === 0;
                  return (
                    <tr key={trade.id} className="border-t border-border">
                      {showMergedCells && (
                        <td rowSpan={group.items.length} className="border-r border-border px-4 py-3 align-middle text-muted">
                          {group.dateLabel}
                        </td>
                      )}
                      <td className="px-4 py-3 font-medium">{trade.instrument}</td>
                      <td className="px-4 py-3">
                        <Badge tone={trade.tradeType === "BUY" ? "success" : "danger"}>
                          {trade.tradeType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted">
                        {trade.entryPrice.toString()}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted">{trade.stopLoss.toString()}</td>
                      <td className="px-4 py-3 tabular-nums text-muted">{trade.target1.toString()}</td>
                      <td className="px-4 py-3 tabular-nums text-muted">{trade.target2.toString()}</td>
                      <td className="px-4 py-3 tabular-nums text-muted">{trade.target3?.toString() ?? "-"}</td>
                      <td className="border-r border-border px-4 py-3">
                        <Badge tone={isWin ? "success" : trade.status === "STOP_LOSS_HIT" ? "danger" : "neutral"}>
                          {tradeStatusLabel(trade.status)}
                        </Badge>
                      </td>
                      {showMergedCells && (
                        <td
                          rowSpan={group.items.length}
                          className={`px-4 py-3 tabular-nums align-middle ${
                            group.dayPnl === null
                              ? "text-muted"
                              : group.dayPnl > 0
                                ? "text-positive"
                                : group.dayPnl < 0
                                  ? "text-negative"
                                  : "text-muted"
                          }`}
                        >
                          {group.dayPnl === null ? "-" : formatPnl(group.dayPnl)}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
