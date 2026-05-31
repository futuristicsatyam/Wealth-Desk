import { NextResponse } from "next/server";
import { getActivePlans } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public list of active plans (safe, non-sensitive). */
export async function GET() {
  const plans = await getActivePlans();
  return NextResponse.json({ plans });
}
