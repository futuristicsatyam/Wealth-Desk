import type { Prisma } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AuditFilter } from "@/components/admin/audit-filter";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Parse a "YYYY-MM-DD" input into a Date, or null if empty/invalid. */
function parseDate(value: string, endOfDay = false): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default async function AdminAuditPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; action?: string; from?: string; to?: string }>;
}) {
  const { q = "", action = "", from = "", to = "" } = await searchParams;
  const term = q.trim();
  const fromDate = parseDate(from);
  const toDate = parseDate(to, true);

  const createdAt: Prisma.DateTimeFilter = {};
  if (fromDate) createdAt.gte = fromDate;
  if (toDate) createdAt.lte = toDate;

  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action } : {}),
    ...(fromDate || toDate ? { createdAt } : {}),
    ...(term
      ? {
          OR: [
            { summary: { contains: term, mode: "insensitive" } },
            { actorName: { contains: term, mode: "insensitive" } },
            { entity: { contains: term, mode: "insensitive" } },
            { entityId: { contains: term, mode: "insensitive" } },
            { ipAddress: { contains: term, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [entries, actionGroups] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
    // Distinct action names, sourced from the data so the list never drifts.
    prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" }
    })
  ]);
  const actions = actionGroups.map((a) => a.action);
  const hasFilters = Boolean(term || action || from || to);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="mt-1 text-sm text-muted">
          Immutable record of every privileged action on the platform.
        </p>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>
            {entries.length} {hasFilters ? "matching" : "recorded"} events
          </CardTitle>
          <AuditFilter q={q} action={action} from={from} to={to} actions={actions} />
        </div>
        {entries.length === 0 ? (
          <EmptyState title={hasFilters ? "No events match your filters" : "No audit entries yet"} />
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
