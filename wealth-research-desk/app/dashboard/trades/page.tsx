import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TradeCard, type TradeCardData } from "@/components/trade-card";
import { PageBanner } from "@/components/ui/page-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/session";
import { getEntitlement } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const user = await requireUser();
  const entitlement = await getEntitlement(user.id);

  if (!entitlement.active) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Trades</h1>
        <Card className="space-y-3 text-center">
          <p className="text-base font-semibold">An active subscription is required</p>
          <p className="text-sm text-muted">
            Start the 5-day trial or choose a plan to unlock daily research.
          </p>
          <div>
            <Link href="/dashboard/subscription">
              <Button>View plans</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Trial accounts only see trades flagged isTrialVisible.
  const trades = await prisma.trade.findMany({
    where: {
      status: "ACTIVE",
      ...(entitlement.trialVisibleOnly ? { isTrialVisible: true } : {})
    },
    orderBy: { postedAt: "desc" },
    include: { analyst: { select: { name: true } } }
  });

  const cards: TradeCardData[] = trades.map((trade) => ({
    id: trade.id,
    instrument: trade.instrument,
    segment: trade.segment,
    tradeType: trade.tradeType,
    entryPrice: trade.entryPrice.toString(),
    stopLoss: trade.stopLoss.toString(),
    target1: trade.target1.toString(),
    target2: trade.target2.toString(),
    target3: trade.target3?.toString() ?? null,
    riskRating: trade.riskRating,
    status: trade.status,
    analystName: trade.analyst.name,
    rationale: trade.rationale,
    postedAt: formatDateTime(trade.postedAt)
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Active trades</h1>
          <p className="mt-1 text-sm text-muted">Live research setups currently being tracked.</p>
        </div>
        <Badge tone="accent">{entitlement.planName}</Badge>
      </div>

      {entitlement.trialVisibleOnly && (
        <PageBanner
          tone="info"
          message="Trial access shows a curated subset of trades. Upgrade to a paid plan for the full feed."
        />
      )}

      {cards.length === 0 ? (
        <EmptyState
          title="No active trades right now"
          hint="New setups are published through the trading day."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {cards.map((trade) => (
            <TradeCard key={trade.id} trade={trade} />
          ))}
        </div>
      )}
    </div>
  );
}
