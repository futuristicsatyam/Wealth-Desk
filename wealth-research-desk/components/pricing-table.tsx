"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InlineToast } from "@/components/ui/inline-toast";
import { cn } from "@/lib/utils";
import { formatInr } from "@/lib/format";

export type PlanView = {
  code: string;
  name: string;
  description: string | null;
  amountPaise: number;
  durationDays: number;
  referralBonusDays: number;
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

const GAP_PX = 16; // matches gap-4 on the mobile track

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

  // Mobile carousel state (unused on sm+ where the grid renders instead).
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const orderedPlans = useMemo(
    () => [...plans].sort((a, b) => Number(b.isTrial) - Number(a.isTrial) || a.amountPaise - b.amountPaise),
    [plans]
  );

  // Highlight the paid plan with the longest access window as "Best value".
  const featuredCode = useMemo(() => {
    const paid = orderedPlans.filter((p) => !p.isTrial);
    if (paid.length === 0) return null;
    return paid.reduce((best, p) => (p.durationDays > best.durationDays ? p : best)).code;
  }, [orderedPlans]);

  function scrollToIndex(i: number) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-slide]");
    const step = card ? card.offsetWidth + GAP_PX : el.clientWidth;
    el.scrollTo({ left: Math.max(0, Math.min(i, orderedPlans.length - 1)) * step, behavior: "smooth" });
  }
  function handleScroll() {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-slide]");
    const step = card ? card.offsetWidth + GAP_PX : el.clientWidth;
    if (step > 0) setActive(Math.round(el.scrollLeft / step));
  }

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

  /** The plan card itself — shared by the mobile carousel and the desktop grid. */
  function renderCard(plan: PlanView) {
    const trialBlocked = plan.isTrial && context === "member" && !trialEligible;
    const featured = plan.code === featuredCode;
    const durationLabel = `${plan.durationDays} day${plan.durationDays > 1 ? "s" : ""} of access`;

    return (
      <div
        className={cn(
          "relative flex h-full flex-col rounded-2xl border p-6 transition-colors duration-200 sm:p-7",
          featured
            ? "border-accent/50 bg-gradient-to-b from-accent/[0.08] to-card shadow-glow-accent"
            : "border-border bg-card"
        )}
      >
        {featured && (
          <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-b from-accent to-accent-strong px-3 py-1 text-[11px] font-semibold text-background shadow-glow-sm">
            Best value
          </span>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">{plan.name}</p>
          {plan.isTrial && <Badge tone="neutral">One-time</Badge>}
        </div>

        {/* Price */}
        <div className="mt-6 flex items-end gap-1.5">
          <span className="font-mono text-4xl font-semibold tracking-tight text-foreground">
            {plan.amountPaise === 0 ? "Free" : formatInr(plan.amountPaise)}
          </span>
          {plan.amountPaise !== 0 && (
            <span className="mb-1.5 text-xs text-muted">/ {plan.durationDays}d</span>
          )}
        </div>
        <p className="mt-2 text-sm text-muted">{durationLabel}</p>
        {plan.description && <p className="mt-3 text-sm leading-relaxed text-muted">{plan.description}</p>}

        {/* Divider */}
        <div className="my-6 h-px bg-border" />

        {/* Features */}
        <ul className="space-y-3 text-sm">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <Check size={16} className="mt-0.5 shrink-0 text-accent" strokeWidth={2.5} />
              <span className="leading-relaxed text-foreground/85">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-auto pt-8">
          <Button
            className="w-full"
            variant={featured ? "primary" : plan.isTrial ? "secondary" : "outline"}
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
        </div>
      </div>
    );
  }

  if (orderedPlans.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">No plans are currently available. Please check back soon.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {toast && <InlineToast tone={toast.tone} message={toast.message} />}

      {/* ── Mobile: swipeable carousel (one card centred, neighbours peeking) ── */}
      <div className="sm:hidden">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[10%] py-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {orderedPlans.map((plan) => (
            <div key={plan.code} data-slide className="w-[80%] shrink-0 snap-center">
              {renderCard(plan)}
            </div>
          ))}
        </div>

        {/* Dot indicators */}
        <div className="mt-3 flex justify-center gap-2">
          {orderedPlans.map((plan, i) => (
            <button
              key={plan.code}
              type="button"
              aria-label={`Go to ${plan.name} plan`}
              aria-current={i === active}
              onClick={() => scrollToIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-200",
                i === active ? "w-6 bg-accent" : "w-2 bg-border-strong"
              )}
            />
          ))}
        </div>
      </div>

      {/* ── sm and up: 3-per-row grid, last partial row centred ── */}
      <div className="hidden flex-wrap justify-center gap-6 sm:flex">
        {orderedPlans.map((plan) => (
          <div key={plan.code} className="w-full grow-0 sm:w-[47%] lg:w-[31%]">
            {renderCard(plan)}
          </div>
        ))}
      </div>
    </div>
  );
}
