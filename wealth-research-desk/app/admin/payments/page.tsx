import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/stat-card";
import { prisma } from "@/lib/prisma";
import { formatInr, formatInrPrecise, formatDateTime, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const [payments, captured] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true } } }
    }),
    prisma.payment.aggregate({ where: { status: "CAPTURED" }, _sum: { amountPaise: true } })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Payments</h1>
          <p className="mt-1 text-sm text-muted">All payment attempts and outcomes.</p>
        </div>
        <a href="/admin/revenue/export" download>
          <Button variant="secondary" size="sm">Export CSV</Button>
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Captured revenue" value={formatInr(captured._sum.amountPaise ?? 0)} />
        <StatCard label="Total records" value={String(payments.length)} />
      </div>

      <Card className="space-y-3">
        <CardTitle>Payment log</CardTitle>
        {payments.length === 0 ? (
          <EmptyState title="No payments recorded" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-2 text-left">Customer</th>
                  <th className="py-2 text-left">Plan</th>
                  <th className="py-2 text-left">Amount</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Invoice</th>
                  <th className="py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-border">
                    <td className="py-2.5">
                      <p>{payment.user.name}</p>
                      <p className="text-xs text-muted">{payment.user.email}</p>
                    </td>
                    <td className="py-2.5">{payment.planName ?? "-"}</td>
                    <td className="py-2.5 tabular-nums">{formatInrPrecise(payment.amountPaise)}</td>
                    <td className="py-2.5">
                      <Badge
                        tone={
                          payment.status === "CAPTURED"
                            ? "success"
                            : payment.status === "FAILED"
                              ? "danger"
                              : "neutral"
                        }
                      >
                        {titleCase(payment.status)}
                      </Badge>
                    </td>
                    <td className="py-2.5 font-mono text-xs">{payment.invoiceNumber ?? "-"}</td>
                    <td className="py-2.5 text-muted">{formatDateTime(payment.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
