import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OutlookPage() {
  // Market Outlook is open to all signed-in users (including non-plan).
  await requireUser();

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  await prisma.marketOutlook.deleteMany({
    where: { createdAt: { lt: cutoff } }
  });

  const outlooks = await prisma.marketOutlook.findMany({
    orderBy: { date: "desc" },
    take: 14,
    include: { analyst: { select: { name: true } } }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Market Outlook</h1>
        <p className="mt-1 text-sm text-muted">Daily index, volatility and institutional read.</p>
      </div>

      {outlooks.length === 0 ? (
        <EmptyState title="No outlook published yet" hint="Check back before the next session." />
      ) : (
        <div className="space-y-4">
          {outlooks.map((o) => (
            <Card key={o.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle>{formatDate(o.date)}</CardTitle>
                <span className="text-xs text-muted">{o.analyst?.name ?? "Research Desk"}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Nifty 50" value={o.nifty} />
                <Field label="Bank Nifty" value={o.bankNifty} />
                <Field label="Volatility" value={o.volatility} />
              </div>
              <Field label="Global cues" value={o.globalCues} />
              <Field label="Sector strength" value={o.sectorStrength} />
              <Field label="Institutional sentiment" value={o.institutionalSentiment} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 text-sm text-foreground/90">{value}</p>
    </div>
  );
}
