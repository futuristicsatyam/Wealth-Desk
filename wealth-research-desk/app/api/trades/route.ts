import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/session";
import { getEntitlement } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Member-only trade feed. Previously this endpoint was unauthenticated, which
 * leaked the paid product. It now requires:
 *   1. an authenticated, non-banned user
 *   2. an ACTIVE subscription (entitlement)
 * Trial users only receive trades flagged isTrialVisible.
 */
export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const entitlement = await getEntitlement(user.id);
  if (!entitlement.active) {
    return NextResponse.json(
      { message: "An active subscription is required to view trades" },
      { status: 403 }
    );
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const validStatuses = ["ACTIVE", "CLOSED", "TARGET1_HIT", "TARGET2_HIT", "TARGET3_HIT", "STOP_LOSS_HIT"];

  const trades = await prisma.trade.findMany({
    where: {
      ...(statusParam && validStatuses.includes(statusParam)
        ? { status: statusParam as never }
        : {}),
      ...(entitlement.trialVisibleOnly ? { isTrialVisible: true } : {})
    },
    orderBy: { postedAt: "desc" },
    take: 100,
    include: { analyst: { select: { name: true } } }
  });

  return NextResponse.json({
    entitlement: { isTrial: entitlement.isTrial, planName: entitlement.planName },
    trades: trades.map((trade) => ({
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
      rationale: trade.rationale,
      analystName: trade.analyst.name,
      postedAt: formatDateTime(trade.postedAt)
    }))
  });
}
