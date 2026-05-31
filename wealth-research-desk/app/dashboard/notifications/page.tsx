import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { markAllNotificationsReadAction } from "@/app/dashboard/actions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60
  });
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="mt-1 text-sm text-muted">{unread} unread alert{unread === 1 ? "" : "s"}.</p>
        </div>
        {unread > 0 && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="secondary" size="sm">
              Mark all read
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState title="No notifications" hint="Trade updates and alerts will appear here." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={n.isRead ? "" : "border-accent/30"}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{n.title}</p>
                    {!n.isRead && <Badge tone="accent">New</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted">{n.body}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted">{formatDateTime(n.createdAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
