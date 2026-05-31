"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { formatInr } from "@/lib/format";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type PlanOption = { code: string; name: string; amountPaise: number; durationDays: number };

export function BillingCheckout({
  plan,
  paymentsConfigured
}: {
  plan: PlanOption | null;
  paymentsConfigured: boolean;
}) {
  const router = useRouter();
  const [scriptReady, setScriptReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(
    null
  );

  useEffect(() => {
    if (document.getElementById("razorpay-checkout")) {
      setScriptReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => setScriptReady(true);
    script.onerror = () => setToast({ tone: "error", message: "Could not load the payment gateway." });
    document.body.appendChild(script);
  }, []);

  if (!plan) {
    return (
      <Card>
        <p className="text-sm text-muted">
          Choose a plan from the subscription page to start a payment.
        </p>
      </Card>
    );
  }

  async function startCheckout() {
    if (!plan) return;
    setBusy(true);
    setToast(null);
    try {
      const orderResponse = await fetch("/api/subscriptions/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: plan.code })
      });
      const orderData = await orderResponse.json();
      if (!orderResponse.ok) {
        setToast({ tone: "error", message: orderData.message ?? "Could not start payment" });
        setBusy(false);
        return;
      }

      if (!window.Razorpay) {
        setToast({ tone: "error", message: "Payment gateway is not ready. Please retry." });
        setBusy(false);
        return;
      }

      const checkout = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Wealth Research Desk",
        description: orderData.planName,
        order_id: orderData.orderId,
        prefill: {
          name: orderData.customer?.name,
          email: orderData.customer?.email,
          contact: orderData.customer?.contact
        },
        theme: { color: "#c9ae7a" },
        handler: async (response: RazorpayResponse) => {
          setToast({ tone: "info", message: "Verifying payment..." });
          const verifyResponse = await fetch("/api/subscriptions/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response)
          });
          const verifyData = await verifyResponse.json();
          if (verifyResponse.ok) {
            setToast({ tone: "success", message: "Subscription activated. Redirecting..." });
            router.push("/dashboard/subscription");
            router.refresh();
          } else {
            setToast({
              tone: "error",
              message: verifyData.message ?? "Verification failed - contact support if charged."
            });
          }
          setBusy(false);
        },
        modal: { ondismiss: () => setBusy(false) }
      });
      checkout.open();
    } catch {
      setToast({ tone: "error", message: "Network error - please retry" });
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4">
      {toast && <InlineToast tone={toast.tone} message={toast.message} />}
      <div>
        <p className="text-xs uppercase tracking-wider text-accent">Selected plan</p>
        <p className="mt-1 text-xl font-semibold">{plan.name}</p>
        <p className="text-sm text-muted">
          {formatInr(plan.amountPaise)} &middot; {plan.durationDays} days &middot; incl. GST invoice
        </p>
      </div>
      {!paymentsConfigured ? (
        <InlineToast tone="error" message="Online payments are not configured. Contact support." />
      ) : (
        <Button onClick={startCheckout} disabled={busy || !scriptReady} className="w-full">
          {busy ? "Processing..." : `Pay ${formatInr(plan.amountPaise)} securely`}
        </Button>
      )}
      <p className="text-xs text-muted">
        Payments are processed by Razorpay. We never see or store your card details.
      </p>
    </Card>
  );
}
