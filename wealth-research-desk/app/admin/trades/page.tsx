import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { IndexForm } from "@/components/admin/index-form";
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
  // Track every trade posted today — active, closed, target-hit or SL-hit.
  // Older trades live in the trade history pages.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfToday.getDate() + 1);

  const [analysts, indexes, trades] = await Promise.all([
    prisma.analyst.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.tradeIndex.findMany({ orderBy: { name: "asc" } }),
    prisma.trade.findMany({
      where: { postedAt: { gte: startOfToday, lt: startOfTomorrow } },
      orderBy: { postedAt: "desc" },
      include: {
        analyst: { select: { name: true } },
        index: { select: { name: true, lotSize: true } }
      }
    })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trades</h1>
        <p className="mt-1 text-sm text-muted">Publish new setups and manage their lifecycle.</p>
      </div>

      <Card>
        <CardTitle>Indexes</CardTitle>
        <div className="mt-4 space-y-4">
          <IndexForm />
          {indexes.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {indexes.map((index) => (
                <div key={index.id} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                  <p className="font-medium">{index.name}</p>
                  <p className="text-xs text-muted">Lot size: {index.lotSize}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No index created yet.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Publish a trade</CardTitle>
        <div className="mt-4">
          <TradeForm
            analysts={analysts.map((a) => ({ id: a.id, name: a.name }))}
            indexes={indexes.map((index) => ({
              id: index.id,
              name: index.name,
              lotSize: index.lotSize
            }))}
          />
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Today&apos;s trades</CardTitle>
        {trades.length === 0 ? (
          <EmptyState
            title="No trades posted today"
            hint="Trades from earlier days are in the trade history pages."
          />
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
                    {trade.index && <Badge tone="neutral">{trade.index.name}</Badge>}
                    {trade.isTrialVisible && <Badge tone="neutral">Trial</Badge>}
                  </div>
                  <span className="text-xs text-muted">
                    {trade.analyst?.name ?? "Unattributed"} &middot; {formatDateTime(trade.postedAt)}
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
