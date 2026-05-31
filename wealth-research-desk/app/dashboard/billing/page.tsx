import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BillingCheckout } from "@/components/billing-checkout";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { formatDate, formatInrPrecise, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planCode } = await searchParams;
  const user = await requireUser();

  const [selectedPlan, payments] = await Promise.all([
    planCode
      ? prisma.planConfig.findFirst({
          where: { code: planCode.toUpperCase(), isActive: true, isTrial: false }
        })
      : Promise.resolve(null),
    prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="mt-1 text-sm text-muted">Complete payments and review your invoices.</p>
      </div>

      <BillingCheckout
        paymentsConfigured={isRazorpayConfigured()}
        plan={
          selectedPlan
            ? {
                code: selectedPlan.code,
                name: selectedPlan.name,
                amountPaise: selectedPlan.amountPaise,
                durationDays: selectedPlan.durationDays
              }
            : null
        }
      />

      <Card className="space-y-3">
        <CardTitle>Payment history</CardTitle>
        {payments.length === 0 ? (
          <EmptyState title="No payments yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-2 text-left">Invoice</th>
                  <th className="py-2 text-left">Plan</th>
                  <th className="py-2 text-left">Amount</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t border-border">
                    <td className="py-2.5 font-mono text-xs">{payment.invoiceNumber ?? "-"}</td>
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
                    <td className="py-2.5 text-muted">{formatDate(payment.createdAt)}</td>
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
