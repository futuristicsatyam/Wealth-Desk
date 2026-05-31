import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/session";
import { verifyOrigin, getClientIp } from "@/lib/csrf";
import { consumeRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { grantSubscriptionFromPayment } from "@/lib/subscription";
import { logAudit } from "@/lib/audit";
import { verifyPaymentSchema, firstError } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Confirms a checkout result from the browser. This endpoint is idempotent:
 * the actual subscription grant runs through grantSubscriptionFromPayment,
 * which is a no-op if the Razorpay webhook already processed the payment.
 */
export async function POST(request: NextRequest) {
  if (!verifyOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin" }, { status: 403 });
  }

  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limit = await consumeRateLimit(`verify:${user.id}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ message: "Too many verification attempts." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = verifyPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: firstError(parsed.error) }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const signatureValid = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature
  });
  if (!signatureValid) {
    return NextResponse.json({ message: "Payment signature verification failed" }, { status: 400 });
  }

  // The Payment row must belong to the requesting user - prevents cross-user claims.
  const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: razorpay_order_id } });
  if (!payment || payment.userId !== user.id) {
    return NextResponse.json({ message: "Payment record not found" }, { status: 404 });
  }

  if (payment.status === "CAPTURED") {
    return NextResponse.json({ ok: true, message: "Payment already confirmed", alreadyDone: true });
  }

  const result = await grantSubscriptionFromPayment({
    paymentId: payment.id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature
  });

  if (!result.granted && result.reason !== "already_processed") {
    return NextResponse.json({ message: "Could not activate subscription" }, { status: 500 });
  }

  await logAudit({
    actorId: user.id,
    actorName: user.name,
    action: "PAYMENT_VERIFIED",
    entity: "Payment",
    entityId: payment.id,
    summary: `${user.name} completed payment for ${payment.planName ?? "a plan"}`,
    metadata: { razorpayOrderId: razorpay_order_id },
    ipAddress: ip
  });

  return NextResponse.json({ ok: true, message: "Subscription activated" });
}
