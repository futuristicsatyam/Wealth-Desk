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
  paymentsConfigured,
  accessToken,
  successHref = "/dashboard/subscription"
}: {
  plan: PlanOption | null;
  paymentsConfigured: boolean;
  /** Present for private/special plans — forwarded to the server for gating. */
  accessToken?: string;
  successHref?: string;
}) {
  const router = useRouter();
  const isFree = Boolean(plan && plan.amountPaise <= 0);
  const [scriptReady, setScriptReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(
    null
  );
  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<{ code: string; discountPaise: number; finalPaise: number } | null>(
    null
  );

  useEffect(() => {
    // Free plans skip Razorpay entirely, so don't bother loading the gateway.
    if (isFree) return;
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
  }, [isFree]);

  async function activateFree() {
    if (!plan || !accessToken) return;
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch("/api/plans/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken })
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ tone: "success", message: "Plan activated. Redirecting..." });
        router.push(successHref);
        router.refresh();
      } else {
        setToast({ tone: "error", message: data.message ?? "Could not activate the plan" });
        setBusy(false);
      }
    } catch {
      setToast({ tone: "error", message: "Network error - please retry" });
      setBusy(false);
    }
  }

  async function applyCoupon() {
    if (!plan || !couponInput.trim()) return;
    setCouponBusy(true);
    setCouponMsg(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), planCode: plan.code })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setCoupon({ code: data.code, discountPaise: data.discountPaise, finalPaise: data.finalPaise });
        setCouponMsg(null);
      } else {
        setCoupon(null);
        setCouponMsg(data.message ?? "This coupon is not valid");
      }
    } catch {
      setCouponMsg("Could not check the coupon — please retry");
    } finally {
      setCouponBusy(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponInput("");
    setCouponMsg(null);
  }

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
        body: JSON.stringify({ planCode: plan.code, accessToken, couponCode: coupon?.code })
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
            router.push(successHref);
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
          {isFree ? (
            "Free"
          ) : coupon ? (
            <>
              <span className="line-through">{formatInr(plan.amountPaise)}</span>{" "}
              <span className="font-semibold text-positive">{formatInr(coupon.finalPaise)}</span>
            </>
          ) : (
            formatInr(plan.amountPaise)
          )}{" "}
          &middot; {plan.durationDays} days{isFree ? "" : " · incl. GST invoice"}
        </p>
      </div>

      {/* Coupon entry — paid plans only. */}
      {!isFree && paymentsConfigured && (
        <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
          {coupon ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm">
                Coupon <span className="font-mono font-semibold">{coupon.code}</span> applied —{" "}
                <span className="text-positive">you save {formatInr(coupon.discountPaise)}</span>
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={removeCoupon}>
                Remove
              </Button>
            </div>
          ) : (
            <>
              <label htmlFor="coupon" className="text-xs font-medium text-muted">
                Have a coupon?
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="coupon"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="h-9 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-sm uppercase outline-none focus:border-accent"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={applyCoupon}
                  disabled={couponBusy || !couponInput.trim()}
                >
                  {couponBusy ? "Checking…" : "Apply"}
                </Button>
              </div>
              {couponMsg && <p className="mt-1.5 text-xs text-negative">{couponMsg}</p>}
            </>
          )}
        </div>
      )}

      {isFree ? (
        <>
          <Button onClick={activateFree} disabled={busy} className="w-full">
            {busy ? "Activating..." : "Activate free access"}
          </Button>
          <p className="text-xs text-muted">
            This is a complimentary plan — no payment is required.
          </p>
        </>
      ) : !paymentsConfigured ? (
        <InlineToast tone="error" message="Online payments are not configured. Contact support." />
      ) : (
        <>
          <Button onClick={startCheckout} disabled={busy || !scriptReady} className="w-full">
            {busy
              ? "Processing..."
              : `Pay ${formatInr(coupon ? coupon.finalPaise : plan.amountPaise)} securely`}
          </Button>
          <p className="text-xs text-muted">
            Payments are processed by Razorpay. We never see or store your card details.
          </p>
        </>
      )}
    </Card>
  );
}
