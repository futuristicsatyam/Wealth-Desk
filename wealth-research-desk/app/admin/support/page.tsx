import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/stat-card";
import { prisma } from "@/lib/prisma";
import { formatDateTime, titleCase } from "@/lib/format";
import { resolveSupportTicketAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const tickets = await prisma.supportTicket.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { user: { select: { name: true, email: true } } }
  });
  const open = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Support Tickets</h1>
        <p className="mt-1 text-sm text-muted">Respond to member queries and update ticket status.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Open / in progress" value={String(open)} />
        <StatCard label="Total tickets" value={String(tickets.length)} />
      </div>

      <Card className="space-y-3">
        <CardTitle>All tickets</CardTitle>
        {tickets.length === 0 ? (
          <EmptyState title="No support tickets" />
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{ticket.subject}</p>
                    <Badge
                      tone={
                        ticket.priority === "HIGH"
                          ? "danger"
                          : ticket.priority === "LOW"
                            ? "neutral"
                            : "warning"
                      }
                    >
                      {titleCase(ticket.priority)}
                    </Badge>
                    <Badge
                      tone={
                        ticket.status === "RESOLVED" || ticket.status === "CLOSED"
                          ? "success"
                          : "neutral"
                      }
                    >
                      {titleCase(ticket.status)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted">{formatDateTime(ticket.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {ticket.user.name} &middot; {ticket.user.email}
                </p>
                <p className="mt-2 text-sm text-foreground/85">{ticket.message}</p>

                <form action={resolveSupportTicketAction} className="mt-3 space-y-2">
                  <input type="hidden" name="ticketId" value={ticket.id} />
                  <Textarea
                    name="response"
                    rows={2}
                    placeholder="Response to the member (optional)"
                    defaultValue={ticket.response ?? ""}
                  />
                  <div className="flex items-end gap-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted">
                        Status
                      </label>
                      <Select name="status" defaultValue={ticket.status} className="h-9">
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </Select>
                    </div>
                    <Button type="submit" size="sm" variant="secondary">
                      Save
                    </Button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
