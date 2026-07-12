import { NextResponse, type NextRequest } from "next/server";
import { drainOutbound } from "@/lib/outbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Give the dispatcher room to work through a backlog within one invocation.
export const maxDuration = 60;

/**
 * Cron-triggered outbox dispatcher. Vercel Cron calls this on a schedule (see
 * vercel.json) with an `Authorization: Bearer <CRON_SECRET>` header. It drains
 * pending Telegram/email messages in chunks until the queue is empty or a work
 * cap is hit, so no single run risks the function timeout.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;
  // Up to 5 chunks of 200 per run (≈1000 messages); the next scheduled tick
  // continues any remaining backlog.
  for (let i = 0; i < 5; i += 1) {
    const result = await drainOutbound(200);
    processed += result.processed;
    sent += result.sent;
    failed += result.failed;
    if (result.processed === 0) break;
  }

  return NextResponse.json({ ok: true, processed, sent, failed });
}
