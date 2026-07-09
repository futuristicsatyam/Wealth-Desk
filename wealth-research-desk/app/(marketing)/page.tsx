import Link from "next/link";
import { ShieldCheck, LineChart, Bell, Gauge, FileCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PricingTable } from "@/components/pricing-table";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { prisma } from "@/lib/prisma";
import { getActivePlans, getTrialPlanInfo } from "@/lib/plans";
import { getCurrentUser } from "@/lib/session";
import { APP_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: LineChart, title: "Daily F&O setups", text: "Structured intraday and positional ideas with defined entry, stop-loss and targets." },
  { icon: Gauge, title: "Risk-first framework", text: "Every setup carries a 1-5 risk rating so you can size positions to your own appetite." },
  { icon: Bell, title: "Time Sensitive", text: "Time-sensitive trade updates delivered the moment analysts publish them." },
  { icon: FileCheck, title: "Performance transparency", text: "Closed-trade outcomes are published openly - wins and losses alike." },
  { icon: ShieldCheck, title: "Compliance-first", text: "No profit guarantees, no fund handling. Education and research only." }
];

const buildSteps = (trialDays: number) => [
  ["01", "Register & verify", "Create an account, verify your mobile with OTP and complete KYC."],
  ["02", "Choose access", `Start the one-time ${trialDays}-day trial or pick a paid membership.`],
  ["03", "Trade independently", "Receive research and execute decisions in your own broker account."]
];

export default async function HomePage() {
  const [user, plans, closedTrades, activeTrades, userCount, trial] = await Promise.all([
    getCurrentUser(),
    getActivePlans(),
    prisma.trade.count({ where: { status: { not: "ACTIVE" } } }),
    prisma.trade.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
    getTrialPlanInfo()
  ]);

  const STEPS = buildSteps(trial.days);

  // Social-proof floor so the counter reads well when the base is small; every
  // real signup counts on top of it, so the number climbs live. Set to 0 to
  // show only the true registered-user count.
  const SIGNUP_BASELINE = 139;
  const activeUsers = SIGNUP_BASELINE + userCount;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: "Wealth Research Desk",
    url: APP_URL,
    areaServed: "IN",
    serviceType: "Stock Market Research",
    description: "Institutional-grade Indian market research and risk-managed trade intelligence."
  };

  const stats = [
    { label: "Live setups", value: activeTrades, hint: "Currently open for tracking" },
    { label: "Closed trades", value: closedTrades, hint: "Published with outcomes" },
    { label: "Active Users", value: activeUsers, hint: "Users Generating Wealth with Wealth Research Desk" }
  ];

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="spotlight absolute inset-0" aria-hidden />
        {/* Animated 3D dotted wave, scoped to the hero (absolute, above the body
            bg, behind content) and faded out toward the stat band. */}
        <DottedSurface className="absolute inset-0 z-0 [mask-image:linear-gradient(black,transparent_88%)]" />
        <div className="container-page relative z-10 grid items-center gap-10 py-14 sm:gap-12 sm:py-20 lg:grid-cols-2 lg:py-28">
          <div className="text-center lg:text-left">
            <Badge tone="accent" live>
              Wealth Research Desk
            </Badge>
            <h1 className="mt-5 max-w-xl text-[26px] font-semibold leading-[1.15] tracking-tight sm:text-4xl md:text-6xl mx-auto lg:mx-0">
              Institutional-grade{" "}
              <span className="text-accent-gradient">F&amp;O research</span> for serious traders
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted sm:text-base mx-auto lg:mx-0">
              Don&apos;t chase the market, understand it. Unlock research-driven opportunities, navigate volatility with confidence, and build consistency through disciplined risk management.
            </p>
            <div className="mt-8 flex justify-center gap-2.5 sm:gap-3 lg:justify-start">
              <Link href={user ? "/dashboard/subscription" : "/register"} className="flex-1 sm:flex-none">
                <Button
                  size="lg"
                  className="group w-full whitespace-nowrap px-3 text-sm sm:w-auto sm:px-7 sm:text-base"
                >
                  Start {trial.days}-day trial
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link href="/membership" className="flex-1 sm:flex-none">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full whitespace-nowrap px-3 text-sm sm:w-auto sm:px-7 sm:text-base"
                >
                  View membership
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted">
              No profit guarantees · Research &amp; education only · Cancel anytime
            </p>
          </div>

          <div className="relative">
            <HeroVisual />
          </div>
        </div>

        {/* Stat band */}
        <div className="container-page relative z-10 pb-16">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center justify-center gap-1 px-2 py-5 text-center backdrop-blur bg-card/80 sm:block sm:px-6 sm:py-6 sm:text-left"
              >
                {/* Mobile: value stacked over label (no hint), 3 across. sm+: label / value / hint. */}
                <p className="text-[11px] uppercase tracking-wider text-muted sm:text-xs">{s.label}</p>
                <AnimatedNumber
                  value={s.value}
                  className="order-first font-mono text-2xl font-semibold tracking-tight text-foreground sm:order-none sm:mt-2 sm:block sm:text-3xl"
                />
                <p className="hidden text-xs text-muted sm:mt-1 sm:block">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features (open layout, no cards) ─────────────────────────────── */}
      <section className="container-page py-20 md:py-28">
        <Reveal className="mx-auto max-w-2xl text-center sm:mx-0 sm:text-left">
          <p className="text-xs uppercase tracking-[0.22em] text-accent">The desk</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
            Everything you need to trade with discipline
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            Research, risk framework and delivery - built around the way serious market participants
            actually work.
          </p>
        </Reveal>
        <Stagger className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <StaggerItem
              key={title}
              className="group flex flex-col items-center text-center sm:items-start sm:text-left"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/20 transition-colors duration-200 group-hover:bg-accent/15">
                <Icon size={20} strokeWidth={2} />
              </span>
              <h3 className="mt-5 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ── How it works (numbered stepper) ──────────────────────────────── */}
      <section className="relative border-y border-border bg-surface">
        <div className="container-page py-20 md:py-28">
          <Reveal className="mx-auto max-w-2xl text-center sm:mx-0 sm:text-left">
            <p className="text-xs uppercase tracking-[0.22em] text-accent">Getting started</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              Up and running in three steps
            </h2>
          </Reveal>
          <div className="relative mt-16">
            {/* Connecting rail through the step nodes (desktop only). */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-border-strong to-transparent md:block"
            />
            <Stagger className="grid gap-12 md:grid-cols-3 md:gap-8">
              {STEPS.map(([num, title, text]) => (
                <StaggerItem
                  key={num}
                  className="relative flex flex-col items-center text-center md:items-start md:text-left"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-background font-mono text-sm font-semibold text-accent shadow-glow-sm">
                    {num}
                  </span>
                  <h3 className="mt-6 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{text}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section className="container-page py-20 md:py-28">
        <Reveal className="mx-auto max-w-2xl text-center sm:mx-0 sm:text-left">
          <p className="text-xs uppercase tracking-[0.22em] text-accent">Membership</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">Choose your plan</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            One-time {trial.days}-day trial for new members.
          </p>
        </Reveal>
        <div className="mt-14">
          <PricingTable
            plans={plans}
            context="public"
            isAuthenticated={Boolean(user)}
            trialEligible={false}
            hasKyc={false}
          />
        </div>
      </section>

      {/* JSON-LD is a non-executable data block, so CSP does not require a nonce.
          Adding one causes a hydration mismatch (browsers blank the nonce attr). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
