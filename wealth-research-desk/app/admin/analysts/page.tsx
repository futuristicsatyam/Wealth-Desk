import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AnalystForm } from "@/components/admin/analyst-form";
import { prisma } from "@/lib/prisma";
import { toggleAnalystActiveAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminAnalystsPage() {
  const analysts = await prisma.analyst.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { trades: true } } }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analysts</h1>
        <p className="mt-1 text-sm text-muted">
          Manage the research team. Trades are attributed to these analysts.
        </p>
      </div>

      <Card>
        <CardTitle>Add an analyst</CardTitle>
        <div className="mt-4">
          <AnalystForm />
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Research team</CardTitle>
        {analysts.length === 0 ? (
          <EmptyState title="No analysts added yet" />
        ) : (
          <div className="space-y-2">
            {analysts.map((analyst) => (
              <div
                key={analyst.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{analyst.name}</p>
                    <Badge tone={analyst.isActive ? "success" : "neutral"}>
                      {analyst.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted">
                    {analyst.specialization} &middot; {analyst.experienceYears} yrs &middot; SEBI{" "}
                    {analyst.sebiRegistration} &middot; {analyst._count.trades} trades
                  </p>
                </div>
                <form action={toggleAnalystActiveAction}>
                  <input type="hidden" name="analystId" value={analyst.id} />
                  <Button type="submit" size="sm" variant="secondary">
                    {analyst.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
