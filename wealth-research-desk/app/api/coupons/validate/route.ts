import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/session";
import { verifyOrigin } from "@/lib/csrf";
import { consumeRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { validateCoupon } from "@/lib/coupons";
import { validateCouponSchema, firstError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Previews a coupon for the signed-in user + plan, returning the discounted price. */
export async function POST(request: NextRequest) {
  if (!verifyOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }

  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  // Throttle guessing of coupon codes.
  const limit = await consumeRateLimit(`coupon:${user.id}`, 30, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ message: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = validateCouponSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ valid: false, message: firstError(parsed.error) }, { status: 400 });
  }

  const plan = await prisma.planConfig.findUnique({ where: { code: parsed.data.planCode } });
  if (!plan || !plan.isActive) {
    return NextResponse.json({ valid: false, message: "Selected plan is unavailable" }, { status: 404 });
  }

  const result = await validateCoupon({ code: parsed.data.code, plan, userId: user.id });
  if (!result.ok) {
    return NextResponse.json({ valid: false, message: result.reason });
  }

  return NextResponse.json({
    valid: true,
    code: result.coupon.code,
    discountPaise: result.pricing.discountPaise,
    finalPaise: result.pricing.finalPaise,
    originalPaise: plan.amountPaise
  });
}
