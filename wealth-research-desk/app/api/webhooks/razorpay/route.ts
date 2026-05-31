import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { grantSubscriptionFromPayment } from "@/lib/subscription";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Razorpay webhook receiver. This is the authoritative grant path - it is
 * idempotent via grantSubscriptionFromPayment, so it cannot double-grant even
 * if it races with the browser /verify endpoint.
 *
 * Configure in the Razorpay dashboard:  {APP_URL}/api/webhooks/razorpay
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ message: "Missing signature" }, { status: 400 });
  }

  // Signature must be verified against the EXACT raw body.
  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ message: "Invalid webhook signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const eventType = event.event ?? "unknown";
  const paymentEntity = event.payload?.payment?.entity;

  if ((eventType === "payment.captured" || eventType === "order.paid") && paymentEntity?.order_id) {
    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: paymentEntity.order_id }
    });

    if (payment) {
      const result = await grantSubscriptionFromPayment({
        paymentId: payment.id,
        razorpayPaymentId: paymentEntity.id ?? `webhook_${Date.now()}`
      });
      if (result.granted) {
        await logAudit({
          actorId: "system:razorpay-webhook",
          actorName: "Razorpay Webhook",
          action: "PAYMENT_CAPTURED",
          entity: "Payment",
          entityId: payment.id,
          summary: `Webhook captured payment for ${payment.planName ?? "a plan"}`,
          metadata: { eventType, orderId: paymentEntity.order_id }
        });
      }
    }
  } else if (eventType === "payment.failed" && paymentEntity?.order_id) {
    await prisma.payment.updateMany({
      where: { razorpayOrderId: paymentEntity.order_id, status: "CREATED" },
      data: { status: "FAILED" }
    });
  }

  // Always 200 so Razorpay does not retry indefinitely for handled events.
  return NextResponse.json({ received: true });
}
