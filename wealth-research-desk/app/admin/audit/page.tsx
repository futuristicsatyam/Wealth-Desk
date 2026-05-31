import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const entries = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="mt-1 text-sm text-muted">
          Immutable record of every privileged action on the platform.
        </p>
      </div>

      <Card className="space-y-3">
        <CardTitle>{entries.length} recorded events</CardTitle>
        {entries.length === 0 ? (
          <EmptyState title="No audit entries yet" />
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border bg-surface px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">{entry.action}</Badge>
                    <span className="text-sm">{entry.summary}</span>
                  </div>
                  <span className="text-[10px] text-muted">{formatDateTime(entry.createdAt)}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {entry.actorName} &middot; {entry.entity}
                  {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
