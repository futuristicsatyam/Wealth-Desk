import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { markAllNotificationsReadAction } from "@/app/dashboard/actions";
import { TelegramConnect } from "@/components/dashboard/telegram-connect";
import { telegramBotUsername } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  await prisma.notification.deleteMany({
    where: {
      userId: user.id,
      createdAt: { lt: cutoff }
    }
  });

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60
  });
  const unread = notifications.filter((n) => !n.isRead).length;

  // Telegram perk: only surface the connect card to members whose active plan
  // enables it, and only when the bot is actually configured.
  let showTelegram = false;
  let telegramLinked = false;
  if (telegramBotUsername()) {
    const now = new Date();
    const telegramPlans = await prisma.planConfig.findMany({
      where: { telegramAlerts: true },
      select: { code: true }
    });
    const eligibleCodes = telegramPlans.map((plan) => plan.code);
    if (eligibleCodes.length > 0) {
      const [eligibleSub, dbUser] = await Promise.all([
        prisma.subscription.findFirst({
          where: {
            userId: user.id,
            status: "ACTIVE",
            endDate: { gte: now },
            planCode: { in: eligibleCodes }
          },
          select: { id: true }
        }),
        prisma.user.findUnique({ where: { id: user.id }, select: { telegramChatId: true } })
      ]);
      showTelegram = Boolean(eligibleSub);
      telegramLinked = Boolean(dbUser?.telegramChatId);
    }
  }

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

      {showTelegram && <TelegramConnect linked={telegramLinked} />}

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
