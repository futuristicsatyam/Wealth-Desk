import Link from "next/link";
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

const TARGET_STATUSES = ["TARGET1_HIT", "TARGET2_HIT", "TARGET3_HIT"];

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

  const trades = await prisma.trade.findMany({
    where: {
      status: { not: "ACTIVE" },
      ...(entitlement.trialVisibleOnly ? { isTrialVisible: true } : {})
    },
    orderBy: { closedAt: "desc" },
    take: 80,
    include: { analyst: { select: { name: true } } }
  });

  const wins = trades.filter((t) => TARGET_STATUSES.includes(t.status)).length;
  const losses = trades.filter((t) => t.status === "STOP_LOSS_HIT").length;
  const hitRate = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0;

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
                <th className="px-4 py-3 text-left">Instrument</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Entry</th>
                <th className="px-4 py-3 text-left">Outcome</th>
                <th className="px-4 py-3 text-left">Analyst</th>
                <th className="px-4 py-3 text-left">Closed</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const isWin = TARGET_STATUSES.includes(trade.status);
                return (
                  <tr key={trade.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{trade.instrument}</td>
                    <td className="px-4 py-3">
                      <Badge tone={trade.tradeType === "BUY" ? "success" : "danger"}>
                        {trade.tradeType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {trade.entryPrice.toString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={isWin ? "success" : trade.status === "STOP_LOSS_HIT" ? "danger" : "neutral"}>
                        {tradeStatusLabel(trade.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">{trade.analyst.name}</td>
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
    </div>
  );
}
