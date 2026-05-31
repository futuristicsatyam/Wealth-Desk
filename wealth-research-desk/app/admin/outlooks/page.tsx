import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OutlookForm } from "@/components/admin/outlook-form";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminOutlooksPage() {
  const [analysts, outlooks] = await Promise.all([
    prisma.analyst.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.marketOutlook.findMany({
      orderBy: { date: "desc" },
      take: 30,
      include: { analyst: { select: { name: true } } }
    })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Market Outlooks</h1>
        <p className="mt-1 text-sm text-muted">Publish the daily market view for members.</p>
      </div>

      <Card>
        <CardTitle>Post today&apos;s outlook</CardTitle>
        <div className="mt-4">
          <OutlookForm analysts={analysts.map((a) => ({ id: a.id, name: a.name }))} />
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Published outlooks</CardTitle>
        {outlooks.length === 0 ? (
          <EmptyState title="No outlooks published yet" />
        ) : (
          <ul className="space-y-2">
            {outlooks.map((o) => (
              <li key={o.id} className="rounded-lg border border-border bg-surface px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{formatDate(o.date)}</p>
                  <span className="text-xs text-muted">{o.analyst.name}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Nifty: {o.nifty} &middot; Bank Nifty: {o.bankNifty}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
