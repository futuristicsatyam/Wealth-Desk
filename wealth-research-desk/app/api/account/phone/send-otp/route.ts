import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/session";
import { verifyOrigin } from "@/lib/csrf";
import { consumeRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { sendPhoneOtp } from "@/lib/otp-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sends a phone-verification code to the signed-in member's own number (Twilio). */
export async function POST(request: NextRequest) {
  if (!verifyOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }

  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const limit = await consumeRateLimit(`phone-verify-send:${user.id}`, 6, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ message: "Too many code requests. Try again later." }, { status: 429 });
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true, phoneVerifiedAt: true }
  });
  if (!account) {
    return NextResponse.json({ message: "Account not found" }, { status: 404 });
  }
  if (account.phoneVerifiedAt) {
    return NextResponse.json({ ok: true, message: "Mobile number already verified", alreadyVerified: true });
  }

  const result = await sendPhoneOtp(account.phone);
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }
  return NextResponse.json({ message: result.message, devCode: result.devCode });
}
