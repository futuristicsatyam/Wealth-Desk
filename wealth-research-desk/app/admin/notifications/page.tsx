import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BroadcastForm } from "@/components/admin/broadcast-form";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  // Group by batchId so each broadcast shows as one row, not one-per-recipient.
  const recent = await prisma.notification.findMany({
    where: { batchId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const batches = new Map<
    string,
    { title: string; body: string; createdAt: Date; count: number; audience: string }
  >();
  for (const n of recent) {
    const key = n.batchId as string;
    const existing = batches.get(key);
    if (existing) existing.count += 1;
    else
      batches.set(key, {
        title: n.title,
        body: n.body,
        createdAt: n.createdAt,
        count: 1,
        audience: n.audience ?? "all"
      });
  }
  const history = [...batches.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Broadcasts</h1>
        <p className="mt-1 text-sm text-muted">
          Send announcements to members across dashboard, email and Telegram.
        </p>
      </div>

      <Card>
        <CardTitle>New broadcast</CardTitle>
        <div className="mt-4">
          <BroadcastForm />
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Broadcast history</CardTitle>
        {history.length === 0 ? (
          <EmptyState title="No broadcasts sent yet" />
        ) : (
          <ul className="space-y-2">
            {history.map((batch, index) => (
              <li key={index} className="rounded-lg border border-border bg-surface px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{batch.title}</p>
                  <Badge tone="neutral">{batch.count} recipients</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">{batch.body}</p>
                <p className="mt-1 text-[10px] text-muted">
                  {batch.audience} &middot; {formatDateTime(batch.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
