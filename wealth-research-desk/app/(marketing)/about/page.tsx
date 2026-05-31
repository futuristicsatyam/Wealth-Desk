import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "About",
  description: "Wealth Research Desk - a SEBI-registered research desk for Indian market participants."
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const analysts = await prisma.analyst.findMany({
    where: { isActive: true },
    orderBy: { experienceYears: "desc" }
  });

  return (
    <main className="container-page py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">About us</p>
      <h1 className="mt-3 text-4xl font-semibold">A research desk, not a tip service</h1>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
        Wealth Research Desk publishes structured, risk-managed research for Indian equity and
        derivatives markets. We exist to help independent participants make better-informed decisions -
        we never execute trades, handle client money, or promise returns. Every idea is documented with
        a clear rationale and an explicit risk rating.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Card className="space-y-2">
          <p className="text-lg font-semibold">Our methodology</p>
          <p className="text-sm text-muted">
            Setups combine market structure, volatility regime and institutional positioning, with
            defined invalidation levels on every call.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-lg font-semibold">Our principles</p>
          <p className="text-sm text-muted">
            Risk first, transparency always. We publish losing trades as openly as winning ones.
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-lg font-semibold">Our boundaries</p>
          <p className="text-sm text-muted">
            Research and education only. Members act independently in their own broker accounts.
          </p>
        </Card>
      </div>

      <h2 className="mt-14 text-2xl font-semibold">Research team</h2>
      {analysts.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Analyst profiles will be published soon.</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {analysts.map((analyst) => (
            <Card key={analyst.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">{analyst.name}</p>
                <span className="text-xs text-muted">{analyst.experienceYears} yrs</span>
              </div>
              <p className="text-xs uppercase tracking-wider text-accent">{analyst.specialization}</p>
              <p className="text-sm text-muted">{analyst.bio}</p>
              <p className="text-xs text-muted">SEBI Reg: {analyst.sebiRegistration}</p>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
