import type { Prisma, TicketStatus } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/stat-card";
import { SupportFilter } from "@/components/admin/support-filter";
import { prisma } from "@/lib/prisma";
import { formatDateTime, titleCase } from "@/lib/format";
import { resolveSupportTicketAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const TICKET_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const TICKET_PRIORITIES = ["HIGH", "MEDIUM", "LOW"];

export default async function AdminSupportPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string; priority?: string }>;
}) {
  const { q = "", status = "", priority = "" } = await searchParams;
  const term = q.trim();

  const where: Prisma.SupportTicketWhereInput = {
    ...(TICKET_STATUSES.includes(status as TicketStatus) ? { status: status as TicketStatus } : {}),
    ...(TICKET_PRIORITIES.includes(priority) ? { priority } : {}),
    ...(term
      ? {
          OR: [
            { subject: { contains: term, mode: "insensitive" } },
            { message: { contains: term, mode: "insensitive" } },
            { user: { name: { contains: term, mode: "insensitive" } } },
            { user: { email: { contains: term, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [tickets, totalCount, open] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      include: { user: { select: { name: true, email: true } } }
    }),
    // Stat cards show global totals, independent of the active filters.
    prisma.supportTicket.count(),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Support Tickets</h1>
        <p className="mt-1 text-sm text-muted">Respond to member queries and update ticket status.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Open / in progress" value={String(open)} />
        <StatCard label="Total tickets" value={String(totalCount)} />
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>All tickets</CardTitle>
          <SupportFilter q={q} status={status} priority={priority} />
        </div>
        {tickets.length === 0 ? (
          <EmptyState
            title={term || status || priority ? "No tickets match your filters" : "No support tickets"}
          />
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
