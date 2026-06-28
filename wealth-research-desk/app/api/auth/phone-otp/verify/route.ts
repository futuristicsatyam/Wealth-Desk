import { NextResponse, type NextRequest } from "next/server";
import { verifyOrigin, getClientIp } from "@/lib/csrf";
import { consumeRateLimit } from "@/lib/rate-limit";
import { checkPhoneOtp } from "@/lib/otp-service";
import { phoneVerifySchema, firstError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!verifyOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const limit = await consumeRateLimit(`otp-verify:${ip}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ message: "Too many attempts." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = phoneVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: firstError(parsed.error) }, { status: 400 });
  }

  // Per-phone ceiling that, unlike the OTP record's attempt counter, does NOT
  // reset when a new code is requested - bounds total guesses against a number.
  const phoneLimit = await consumeRateLimit(`otp-verify-phone:${parsed.data.phone}`, 10, 60 * 60 * 1000);
  if (!phoneLimit.allowed) {
    return NextResponse.json({ message: "Too many attempts. Please try again later." }, { status: 429 });
  }

  // consume = false: registration consumes the OTP authoritatively later.
  const result = await checkPhoneOtp(parsed.data.phone, parsed.data.otp, false);
  return NextResponse.json({ ok: result.ok, message: result.message }, {
    status: result.ok ? 200 : 400
  });
}
