import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Wealth Research Desk exists, what we stand for, and how our SEBI-registered research desk is different from tip services."
};

const VALUES = [
  {
    title: "Risk before reward",
    text: "Every idea begins with what you could lose - a defined stop-loss and risk rating come before any target."
  },
  {
    title: "Radical transparency",
    text: "We publish the trades that don't work as openly as the ones that do, with the original reasoning intact."
  },
  {
    title: "You stay in control",
    text: "We inform your decisions - we never execute trades, hold your money, or promise a single rupee of return."
  }
];

const DIFFERENTIATORS = [
  {
    title: "Research, not tips",
    text: "No blind buy/sell blasts. Every call carries a written rationale, entry, stop-loss and targets so you understand the 'why', not just the 'what'."
  },
  {
    title: "Prepared by SEBI-registered analysts",
    text: "Our research is authored by SEBI-registered research analysts who follow a disciplined, documented process - not anonymous social-media callers."
  },
  {
    title: "An honest track record",
    text: "Outcomes are shown in points and results - wins and losses both. We'd rather earn slow trust than sell a fake win rate."
  },
  {
    title: "No conflict of interest",
    text: "We don't broker your trades, run a fund, or take custody of your capital. Our only job is good research; your broker account stays entirely yours."
  }
];

// Prose kept as string constants (not JSX text) so quotes/apostrophes don't
// trip react/no-unescaped-entities at build time.
const ORIGIN_1 =
  'We started Wealth Research Desk because we were tired of what passes for "advice" in the Indian markets - anonymous Telegram calls, screenshots of only the winning trades, and confident promises that quietly disappear when they’re wrong. We had spent years on the research side of the desk, and we knew traders deserved better than hype.';
const ORIGIN_2 =
  'So we built the desk we wished existed: one where every call is written down with its reasoning and its risk, where losing trades stay on the record, and where the member - not the "guru" - makes the final decision. That’s the whole idea. No shortcuts, no guarantees, just honest research you can actually reason about.';
const DIFF_INTRO =
  "Plenty of services will tell you what to buy. Very few will show you why, and even fewer will stand by it when a trade goes against them. Here’s where we’re genuinely different.";
const CLOSING =
  "You don’t have to take our word for any of this - that’s rather the point. Start with a short trial, read the reasoning behind live setups, and judge the desk on its own transparency. There’s no lock-in, and you can step away whenever you like. When you’re ready, we’ll be glad to have you at the desk.";

export default function AboutPage() {
  return (
    <main className="container-page py-16">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <p className="text-xs uppercase tracking-[0.2em] text-accent">About us</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight">
        A research desk
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
        Wealth Research Desk publishes structured, risk-managed research for Indian equity and
        derivatives markets. We exist to help independent traders make better-informed decisions -
        we never execute trades, handle client money, or promise returns. Every idea is documented
        with a clear rationale and an explicit risk rating.
      </p>

      {/* ── Origin story ─────────────────────────────────────────────────── */}
      <section className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-semibold">Why we exist</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">{ORIGIN_1}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">{ORIGIN_2}</p>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────────── */}
      <section className="mt-14">
        <Card className="border-accent/30 bg-accent/5">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Our mission</p>
          <p className="mt-3 max-w-3xl text-xl font-medium leading-snug">
            To give independent traders institutional-grade research - and the discipline to use it
            - delivered clearly, honestly, and without hype.
          </p>
        </Card>
      </section>

      {/* ── Core values ──────────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="text-2xl font-semibold">What we stand for</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {VALUES.map((value) => (
            <Card key={value.title} className="space-y-2">
              <p className="text-lg font-semibold">{value.title}</p>
              <p className="text-sm leading-relaxed text-muted">{value.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Differentiators ──────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="text-2xl font-semibold">What makes us different</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">{DIFF_INTRO}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {DIFFERENTIATORS.map((item) => (
            <Card key={item.title} className="space-y-2">
              <p className="text-lg font-semibold">{item.title}</p>
              <p className="text-sm leading-relaxed text-muted">{item.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Closing / confidence ─────────────────────────────────────────── */}
      <section className="mt-16">
        <Card className="flex flex-col items-start gap-5 border-accent/30 bg-accent/5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold">Come see the research for yourself</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{CLOSING}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href="/membership">
              <Button>View membership</Button>
            </Link>
            <Link href="/register">
              <Button variant="secondary">Create an account</Button>
            </Link>
          </div>
        </Card>
        <p className="mt-4 text-xs text-muted">
          Investments in securities markets are subject to risk. Wealth Research Desk provides
          research and educational content only and does not guarantee returns.
        </p>
      </section>
    </main>
  );
}
