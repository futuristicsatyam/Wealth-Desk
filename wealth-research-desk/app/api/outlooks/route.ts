import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/session";
import { getEntitlement } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Member-only market outlook feed. Gated behind auth + active entitlement. */
export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const entitlement = await getEntitlement(user.id);
  if (!entitlement.active) {
    return NextResponse.json(
      { message: "An active subscription is required to view market outlooks" },
      { status: 403 }
    );
  }

  const outlooks = await prisma.marketOutlook.findMany({
    orderBy: { date: "desc" },
    take: 30,
    include: { analyst: { select: { name: true } } }
  });

  return NextResponse.json({
    outlooks: outlooks.map((o) => ({
      id: o.id,
      date: o.date.toISOString(),
      nifty: o.nifty,
      bankNifty: o.bankNifty,
      volatility: o.volatility,
      globalCues: o.globalCues,
      sectorStrength: o.sectorStrength,
      institutionalSentiment: o.institutionalSentiment,
      analystName: o.analyst?.name ?? "Research Desk"
    }))
  });
}
