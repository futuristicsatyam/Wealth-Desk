import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/session";
import { verifyOrigin, getClientIp } from "@/lib/csrf";
import { consumeRateLimit } from "@/lib/rate-limit";
import { activateTrial } from "@/lib/trial";
import { logAudit } from "@/lib/audit";
import { trialActivateSchema, firstError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!verifyOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }

  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limit = await consumeRateLimit(`trial:${user.id}`, 5, 24 * 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ message: "Too many trial attempts." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = trialActivateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: firstError(parsed.error) }, { status: 400 });
  }

  const result = await activateTrial({
    userId: user.id,
    ipAddress: ip,
    deviceFingerprint: parsed.data.deviceFingerprint
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message ?? "Trial activation failed" }, { status: 400 });
  }

  await logAudit({
    actorId: user.id,
    actorName: user.name,
    action: "TRIAL_ACTIVATED",
    entity: "Subscription",
    entityId: user.id,
    summary: `${user.name} activated the trial`,
    ipAddress: ip
  });

  return NextResponse.json({ ok: true, message: "Trial activated" });
}
