import Link from "next/link";
import { ShieldCheck, LineChart, Bell, Users, Gauge, FileCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PricingTable } from "@/components/pricing-table";
import { StatCard } from "@/components/stat-card";
import { prisma } from "@/lib/prisma";
import { getActivePlans } from "@/lib/plans";
import { getCurrentUser } from "@/lib/session";
import { APP_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: LineChart, title: "Daily F&O setups", text: "Structured intraday and positional ideas with defined entry, stop-loss and targets." },
  { icon: Gauge, title: "Risk-first framework", text: "Every setup carries a 1-5 risk rating so you can size positions to your own appetite." },
  { icon: Bell, title: "Telegram & email alerts", text: "Time-sensitive trade updates delivered the moment analysts publish them." },
  { icon: Users, title: "Multi-analyst desk", text: "Research from SEBI-registered analysts across index derivatives and equities." },
  { icon: FileCheck, title: "Performance transparency", text: "Closed-trade outcomes are published openly - wins and losses alike." },
  { icon: ShieldCheck, title: "Compliance-first", text: "No profit guarantees, no fund handling. Education and research only." }
];

const STEPS = [
  ["01", "Register & verify", "Create an account, verify your mobile with OTP and complete KYC."],
  ["02", "Choose access", "Start the one-time 5-day trial or pick a paid membership."],
  ["03", "Trade independently", "Receive research and execute decisions in your own broker account."]
];

export default async function HomePage() {
  const [user, plans, closedTrades, activeTrades, analystCount] = await Promise.all([
    getCurrentUser(),
    getActivePlans(),
    prisma.trade.count({ where: { status: { not: "ACTIVE" } } }),
    prisma.trade.count({ where: { status: "ACTIVE" } }),
    prisma.analyst.count({ where: { isActive: true } })
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: "Wealth Research Desk",
    url: APP_URL,
    areaServed: "IN",
    serviceType: "Stock Market Research",
    description: "Institutional-grade Indian market research and risk-managed trade intelligence."
  };

  return (
    <main>
      {/* Hero */}
      <section className="surface-grid border-b border-border">
        <div className="container-page py-20">
          <p className="text-xs uppercase tracking-[0.22em] text-accent">SEBI-registered research desk</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            Institutional-grade F&amp;O research for serious market participants
          </h1>
          <p className="mt-6 max-w-2xl text-base text-muted">
            Daily trade opportunities, market outlooks and a disciplined risk framework - prepared by
            SEBI-registered analysts. You stay in control of every decision.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={user ? "/dashboard/subscription" : "/register"}>
              <Button>Start 5-day trial</Button>
            </Link>
            <Link href="/membership">
              <Button variant="secondary">View membership</Button>
            </Link>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <StatCard label="Live setups" value={String(activeTrades)} hint="Currently open for tracking" />
            <StatCard label="Closed trades" value={String(closedTrades)} hint="Published with outcomes" />
            <StatCard label="Research analysts" value={String(analystCount)} hint="SEBI-registered desk" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container-page py-16">
        <h2 className="text-2xl font-semibold">What members get</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="space-y-3">
              <Icon className="text-accent" size={22} />
              <p className="text-base font-semibold">{title}</p>
              <p className="text-sm text-muted">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-surface">
        <div className="container-page py-16">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map(([num, title, text]) => (
              <Card key={num} className="space-y-2">
                <p className="text-sm font-semibold text-accent">{num}</p>
                <p className="text-lg font-semibold">{title}</p>
                <p className="text-sm text-muted">{text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container-page py-16">
        <h2 className="text-2xl font-semibold">Membership plans</h2>
        <p className="mt-2 text-sm text-muted">
          One-time 5-day trial for new members. GST invoices are issued for every paid transaction.
        </p>
        <div className="mt-6">
          <PricingTable
            plans={plans}
            context="public"
            isAuthenticated={Boolean(user)}
            trialEligible={false}
            hasKyc={false}
          />
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
