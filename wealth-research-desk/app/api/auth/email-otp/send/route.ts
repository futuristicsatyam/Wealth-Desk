import { NextResponse, type NextRequest } from "next/server";
import { verifyOrigin, getClientIp } from "@/lib/csrf";
import { consumeRateLimit } from "@/lib/rate-limit";
import { sendEmailOtp } from "@/lib/otp-service";
import { emailSendSchema, firstError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sends a 6-digit email-verification code during registration. */
export async function POST(request: NextRequest) {
  if (!verifyOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const limit = await consumeRateLimit(`email-otp-send:${ip}`, 8, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: "Too many code requests. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = emailSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: firstError(parsed.error) }, { status: 400 });
  }

  // Per-email cap so one address can't be email-bombed via rotating IPs.
  const perEmail = await consumeRateLimit(`email-otp-send-addr:${parsed.data.email}`, 5, 60 * 60 * 1000);
  if (!perEmail.allowed) {
    return NextResponse.json(
      { message: "Too many codes requested for this email. Please try again later." },
      { status: 429 }
    );
  }

  const result = await sendEmailOtp(parsed.data.email);
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }
  return NextResponse.json({ message: result.message, devCode: result.devCode });
}
