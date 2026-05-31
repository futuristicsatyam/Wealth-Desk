"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineToast } from "@/components/ui/inline-toast";
import { formatInr } from "@/lib/format";

export type PlanView = {
  code: string;
  name: string;
  description: string | null;
  amountPaise: number;
  durationDays: number;
  isTrial: boolean;
  features: string[];
};

type PricingTableProps = {
  plans: PlanView[];
  context: "public" | "member";
  isAuthenticated: boolean;
  trialEligible: boolean;
  hasKyc: boolean;
};

/** Stable per-browser device fingerprint used as a weak trial-abuse signal. */
function deviceFingerprint(): string {
  if (typeof window === "undefined") return "server";
  const key = "wrd_device_id";
  let cached = window.localStorage.getItem(key);
  if (!cached) {
    cached = `${navigator.userAgent}|${navigator.language}|${Intl.DateTimeFormat().resolvedOptions().timeZone}|${crypto.randomUUID()}`;
    window.localStorage.setItem(key, cached);
  }
  return cached;
}

export function PricingTable({
  plans,
  context,
  isAuthenticated,
  trialEligible,
  hasKyc
}: PricingTableProps) {
  const router = useRouter();
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);

  const orderedPlans = useMemo(
    () => [...plans].sort((a, b) => Number(b.isTrial) - Number(a.isTrial) || a.amountPaise - b.amountPaise),
    [plans]
  );

  async function activateTrial(code: string) {
    setBusyCode(code);
    setToast(null);
    try {
      const response = await fetch("/api/trial/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceFingerprint: deviceFingerprint() })
      });
      const payload = await response.json();
      if (!response.ok) {
        setToast({ tone: "error", message: payload.message ?? "Trial could not be activated" });
        return;
      }
      setToast({ tone: "success", message: "Trial activated. Redirecting..." });
      router.push("/dashboard/trades");
      router.refresh();
    } catch {
      setToast({ tone: "error", message: "Network error - please retry" });
    } finally {
      setBusyCode(null);
    }
  }

  function choosePlan(plan: PlanView) {
    if (plan.isTrial) {
      if (!isAuthenticated) {
        router.push("/register");
        return;
      }
      if (context === "public") {
        router.push("/dashboard/subscription");
        return;
      }
      if (!trialEligible) {
        setToast({ tone: "info", message: "Trial is not available on this account." });
        return;
      }
      void activateTrial(plan.code);
      return;
    }

    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/dashboard/billing?plan=${plan.code}`)}`);
      return;
    }
    if (context === "member" && !hasKyc) {
      router.push("/dashboard?kyc=required");
      return;
    }
    router.push(`/dashboard/billing?plan=${plan.code}`);
  }

  if (orderedPlans.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">No plans are currently available. Please check back soon.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {toast && <InlineToast tone={toast.tone} message={toast.message} />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {orderedPlans.map((plan) => {
          const trialBlocked = plan.isTrial && context === "member" && !trialEligible;
          return (
            <Card key={plan.code} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.18em] text-accent">{plan.name}</p>
                {plan.isTrial && <Badge tone="accent">One-time</Badge>}
              </div>
              <p className="text-3xl font-semibold">
                {plan.amountPaise === 0 ? "Free" : formatInr(plan.amountPaise)}
              </p>
              <p className="text-xs text-muted">
                {plan.durationDays} day{plan.durationDays > 1 ? "s" : ""} of access
              </p>
              {plan.description && <p className="text-xs text-muted">{plan.description}</p>}
              <ul className="space-y-1.5 text-sm text-foreground/85">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-accent">&#8226;</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-auto"
                variant={plan.isTrial ? "secondary" : "primary"}
                disabled={busyCode === plan.code || trialBlocked}
                onClick={() => choosePlan(plan)}
              >
                {busyCode === plan.code
                  ? "Processing..."
                  : trialBlocked
                    ? "Trial used"
                    : plan.isTrial
                      ? "Start trial"
                      : `Choose ${plan.name}`}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
