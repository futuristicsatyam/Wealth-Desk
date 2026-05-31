import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { tradeStatusLabel } from "@/lib/format";

export type TradeCardData = {
  id: string;
  instrument: string;
  segment: string;
  tradeType: "BUY" | "SELL";
  entryPrice: string;
  stopLoss: string;
  target1: string;
  target2: string;
  target3: string | null;
  riskRating: number;
  status: string;
  analystName: string;
  rationale: string;
  postedAt: string;
};

function PriceTile({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold tabular-nums",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function TradeCard({ trade }: { trade: TradeCardData }) {
  const isBuy = trade.tradeType === "BUY";
  const statusTone = trade.status.includes("TARGET")
    ? "success"
    : trade.status === "STOP_LOSS_HIT"
      ? "danger"
      : "neutral";

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-semibold tracking-tight">{trade.instrument}</h3>
            <Badge tone={isBuy ? "success" : "danger"}>{trade.tradeType}</Badge>
            <Badge tone="neutral">{trade.segment}</Badge>
          </div>
          <p className="text-xs text-muted">
            {trade.analystName} &middot; {trade.postedAt}
          </p>
        </div>
        <Badge tone={statusTone}>{tradeStatusLabel(trade.status)}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <PriceTile label="Entry" value={trade.entryPrice} />
        <PriceTile label="Stop Loss" value={trade.stopLoss} tone="negative" />
        <PriceTile label="Target 1" value={trade.target1} tone="positive" />
        <PriceTile label="Target 2" value={trade.target2} tone="positive" />
        <PriceTile label="Target 3" value={trade.target3 ?? "-"} tone="positive" />
      </div>

      <p className="text-sm leading-relaxed text-foreground/85">{trade.rationale}</p>

      <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
        <span>Risk rating</span>
        <span className="font-semibold text-foreground">{trade.riskRating} / 5</span>
      </div>
    </Card>
  );
}
