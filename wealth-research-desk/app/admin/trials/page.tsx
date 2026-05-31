import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/stat-card";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminTrialsPage() {
  const trials = await prisma.trialUsage.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } }
  });

  // Surface hashed IPs reused across accounts - a sign of trial abuse.
  const ipCounts = new Map<string, number>();
  for (const trial of trials) {
    if (trial.ipHash) ipCounts.set(trial.ipHash, (ipCounts.get(trial.ipHash) ?? 0) + 1);
  }
  const flagged = [...ipCounts.entries()].filter(([, count]) => count > 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trials</h1>
        <p className="mt-1 text-sm text-muted">
          Trial activations with abuse signals (shared IP hash / device).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Trials activated" value={String(trials.length)} />
        <StatCard label="Flagged IPs" value={String(flagged.length)} hint="Used by 2+ accounts" />
      </div>

      <Card className="space-y-3">
        <CardTitle>Trial activations</CardTitle>
        {trials.length === 0 ? (
          <EmptyState title="No trials activated yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-2 text-left">User</th>
                  <th className="py-2 text-left">IP hash</th>
                  <th className="py-2 text-left">Device</th>
                  <th className="py-2 text-left">Activated</th>
                </tr>
              </thead>
              <tbody>
                {trials.map((trial) => {
                  const shared = trial.ipHash && (ipCounts.get(trial.ipHash) ?? 0) > 1;
                  return (
                    <tr key={trial.id} className="border-t border-border">
                      <td className="py-2.5">
                        <p>{trial.user.name}</p>
                        <p className="text-xs text-muted">{trial.user.email}</p>
                      </td>
                      <td className={`py-2.5 font-mono text-xs ${shared ? "text-warning" : ""}`}>
                        {trial.ipHash ? trial.ipHash.slice(0, 16) : "-"} {shared ? "(shared)" : ""}
                      </td>
                      <td className="py-2.5 font-mono text-xs text-muted">
                        {trial.deviceFingerprint ? trial.deviceFingerprint.slice(0, 14) : "-"}
                      </td>
                      <td className="py-2.5 text-muted">{formatDateTime(trial.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
