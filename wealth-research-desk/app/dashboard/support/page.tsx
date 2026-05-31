import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SupportForm } from "@/components/dashboard/support-form";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const user = await requireUser();
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Support</h1>
        <p className="mt-1 text-sm text-muted">Raise a tracked ticket - we respond by email.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>New ticket</CardTitle>
          <div className="mt-4">
            <SupportForm />
          </div>
        </Card>

        <Card className="space-y-3">
          <CardTitle>Your tickets</CardTitle>
          {tickets.length === 0 ? (
            <EmptyState title="No tickets yet" />
          ) : (
            <ul className="space-y-2">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="rounded-lg border border-border bg-surface px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{ticket.subject}</p>
                    <Badge
                      tone={
                        ticket.status === "RESOLVED" || ticket.status === "CLOSED"
                          ? "success"
                          : ticket.status === "IN_PROGRESS"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {titleCase(ticket.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{ticket.message}</p>
                  {ticket.response && (
                    <p className="mt-2 rounded-md bg-card px-2 py-1.5 text-xs text-foreground/80">
                      <span className="font-medium text-accent">Response: </span>
                      {ticket.response}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-muted">{formatDateTime(ticket.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
