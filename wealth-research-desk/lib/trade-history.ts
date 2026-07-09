import type { Trade, TradeStatus } from "@prisma/client";
import { formatDate, tradeStatusLabel } from "@/lib/format";

export const TARGET_STATUSES: TradeStatus[] = ["TARGET1_HIT", "TARGET2_HIT", "TARGET3_HIT"];

export type TradeWithIndex = Trade & { index: { lotSize: number } | null };

export function isTargetStatus(status: TradeStatus): boolean {
  return TARGET_STATUSES.includes(status);
}

/** Fully-serializable row for the client table (no Prisma Decimal / Date objects). */
export type TradeRow = {
  id: string;
  instrument: string;
  segment: string;
  tradeType: "BUY" | "SELL";
  entry: string;
  sl: string;
  t1: string;
  t2: string;
  t3: string | null;
  status: TradeStatus;
  statusLabel: string;
  outcomeTone: "success" | "danger" | "neutral";
  closedAtMs: number | null;
  closedLabel: string;
  /** "YYYY-MM" for grouping / null when the trade has no close date. */
  monthKey: string | null;
  /** "Jun 2026" — computed server-side so client rendering can't drift by timezone. */
  monthLabel: string | null;
  pnl: number | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function calculatePnl(trade: TradeWithIndex): number | null {
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

/** Maps Prisma trades to serializable rows for the client history table. */
export function buildTradeRows(trades: TradeWithIndex[]): TradeRow[] {
  return trades.map((trade) => {
    const isWin = isTargetStatus(trade.status);
    const closedAt = trade.closedAt;
    return {
      id: trade.id,
      instrument: trade.instrument,
      segment: trade.segment,
      tradeType: trade.tradeType as "BUY" | "SELL",
      entry: trade.entryPrice.toString(),
      sl: trade.stopLoss.toString(),
      t1: trade.target1.toString(),
      t2: trade.target2.toString(),
      t3: trade.target3?.toString() ?? null,
      status: trade.status,
      statusLabel: tradeStatusLabel(trade.status),
      outcomeTone: isWin ? "success" : trade.status === "STOP_LOSS_HIT" ? "danger" : "neutral",
      closedAtMs: closedAt ? closedAt.getTime() : null,
      closedLabel: closedAt ? formatDate(closedAt) : "-",
      monthKey: closedAt ? `${closedAt.getFullYear()}-${String(closedAt.getMonth() + 1).padStart(2, "0")}` : null,
      monthLabel: closedAt ? `${MONTHS[closedAt.getMonth()]} ${closedAt.getFullYear()}` : null,
      pnl: calculatePnl(trade)
    };
  });
}
