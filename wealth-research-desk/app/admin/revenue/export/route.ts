import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Escapes a value for safe inclusion in a CSV cell. */
function csvCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  await requireAdmin();

  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } }
  });

  const header = [
    "Invoice",
    "Date",
    "Customer",
    "Email",
    "Plan",
    "Plan Type",
    "Amount (INR)",
    "Status",
    "Razorpay Order",
    "Razorpay Payment"
  ];

  const rows = payments.map((payment) =>
    [
      payment.invoiceNumber ?? "",
      payment.createdAt.toISOString(),
      payment.user.name,
      payment.user.email,
      payment.planName ?? "",
      payment.planType ?? "",
      (payment.amountPaise / 100).toFixed(2),
      payment.status,
      payment.razorpayOrderId ?? "",
      payment.razorpayPaymentId ?? ""
    ]
      .map(csvCell)
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");
  const filename = `wrd-revenue-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
