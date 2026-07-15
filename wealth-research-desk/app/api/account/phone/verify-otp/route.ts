import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/session";
import { verifyOrigin, getClientIp } from "@/lib/csrf";
import { consumeRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { checkPhoneOtp } from "@/lib/otp-service";
import { logAudit } from "@/lib/audit";
import { otpOnlySchema, firstError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Verifies the OTP against the member's own number and marks the phone verified. */
export async function POST(request: NextRequest) {
  if (!verifyOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }

  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limit = await consumeRateLimit(`phone-verify-check:${user.id}`, 15, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ message: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = otpOnlySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: firstError(parsed.error) }, { status: 400 });
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true, phoneVerifiedAt: true }
  });
  if (!account) {
    return NextResponse.json({ message: "Account not found" }, { status: 404 });
  }
  if (account.phoneVerifiedAt) {
    return NextResponse.json({ ok: true, message: "Mobile number already verified" });
  }

  const result = await checkPhoneOtp(account.phone, parsed.data.otp, true);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: new Date() } });
  await logAudit({
    actorId: user.id,
    actorName: user.name,
    action: "PHONE_VERIFIED",
    entity: "User",
    entityId: user.id,
    summary: `${user.name} verified their mobile number`,
    ipAddress: ip
  });

  return NextResponse.json({ ok: true, message: "Mobile number verified" });
}
