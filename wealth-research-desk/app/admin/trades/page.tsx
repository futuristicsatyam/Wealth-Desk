import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { TradeForm } from "@/components/admin/trade-form";
import { prisma } from "@/lib/prisma";
import { formatDateTime, tradeStatusLabel } from "@/lib/format";
import { updateTradeStatusAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  "ACTIVE",
  "TARGET1_HIT",
  "TARGET2_HIT",
  "TARGET3_HIT",
  "STOP_LOSS_HIT",
  "CLOSED"
] as const;

export default async function AdminTradesPage() {
  const [analysts, trades] = await Promise.all([
    prisma.analyst.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.trade.findMany({
      orderBy: { postedAt: "desc" },
      take: 50,
      include: { analyst: { select: { name: true } } }
    })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trades</h1>
        <p className="mt-1 text-sm text-muted">Publish new setups and manage their lifecycle.</p>
      </div>

      <Card>
        <CardTitle>Publish a trade</CardTitle>
        <div className="mt-4">
          <TradeForm analysts={analysts.map((a) => ({ id: a.id, name: a.name }))} />
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>All trades</CardTitle>
        {trades.length === 0 ? (
          <EmptyState title="No trades published yet" />
        ) : (
          <div className="space-y-3">
            {trades.map((trade) => (
              <div key={trade.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{trade.instrument}</span>
                    <Badge tone={trade.tradeType === "BUY" ? "success" : "danger"}>
                      {trade.tradeType}
                    </Badge>
                    <Badge tone={trade.status === "ACTIVE" ? "accent" : "neutral"}>
                      {tradeStatusLabel(trade.status)}
                    </Badge>
                    {trade.isTrialVisible && <Badge tone="neutral">Trial</Badge>}
                  </div>
                  <span className="text-xs text-muted">
                    {trade.analyst.name} &middot; {formatDateTime(trade.postedAt)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Entry {trade.entryPrice.toString()} &middot; SL {trade.stopLoss.toString()} &middot;
                  T1 {trade.target1.toString()} &middot; T2 {trade.target2.toString()}
                  {trade.target3 ? ` · T3 ${trade.target3.toString()}` : ""}
                </p>
                <form
                  action={updateTradeStatusAction}
                  className="mt-3 flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="tradeId" value={trade.id} />
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted">Status</label>
                    <Select name="status" defaultValue={trade.status} className="h-9">
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {tradeStatusLabel(status)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Input
                    name="updateMessage"
                    placeholder="Update note (optional)"
                    className="h-9 flex-1 min-w-[180px]"
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    Update
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
