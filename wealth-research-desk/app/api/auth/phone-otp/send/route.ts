import { NextResponse, type NextRequest } from "next/server";
import { verifyOrigin, getClientIp } from "@/lib/csrf";
import { consumeRateLimit } from "@/lib/rate-limit";
import { sendPhoneOtp } from "@/lib/otp-service";
import { phoneSendSchema, firstError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!verifyOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const limit = await consumeRateLimit(`otp-send:${ip}`, 6, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: "Too many code requests. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = phoneSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: firstError(parsed.error) }, { status: 400 });
  }

  const result = await sendPhoneOtp(parsed.data.phone);
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }
  return NextResponse.json({ message: result.message, devCode: result.devCode });
}
