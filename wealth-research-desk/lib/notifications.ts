import crypto from "crypto";
import type { TradeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishUserNotification } from "@/lib/live-notify";
import { sendBulkEmail, emailLayout } from "@/lib/email";
import { sendTelegramMessage } from "@/lib/telegram";
import { escapeHtml } from "@/lib/html";

type Channel = "DASHBOARD" | "EMAIL" | "TELEGRAM";

function prettyTradeStatus(status: TradeStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Sends a broadcast to a target audience across the selected channels. */
export async function broadcastNotification(params: {
  title: string;
  body: string;
  eventType: string;
  audience: "all" | "active_subscribers";
  channels: Channel[];
}): Promise<{ recipients: number; telegram: "sent" | "skipped" | "not_selected"; emailsSent: number }> {
  const recipients = await prisma.user.findMany({
    where:
      params.audience === "active_subscribers"
        ? {
            isBanned: false,
            subscriptions: { some: { status: "ACTIVE", endDate: { gte: new Date() } } }
          }
        : { isBanned: false },
    select: { id: true, email: true }
  });

  const batchId = crypto.randomUUID();

  if (params.channels.includes("DASHBOARD") && recipients.length > 0) {
    await prisma.notification.createMany({
      data: recipients.map((user) => ({
        userId: user.id,
        title: params.title,
        body: params.body,
        channel: "DASHBOARD" as const,
        eventType: params.eventType,
        audience: params.audience,
        batchId
      }))
    });

    const created = await prisma.notification.findMany({
      where: { batchId },
      select: { id: true, userId: true, title: true, body: true, createdAt: true }
    });
    for (const notification of created) {
      publishUserNotification(notification.userId, {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        createdAt: notification.createdAt.toISOString()
      });
    }
  }

  let telegram: "sent" | "skipped" | "not_selected" = "not_selected";
  if (params.channels.includes("TELEGRAM")) {
    const result = await sendTelegramMessage({ title: params.title, body: params.body });
    telegram = result.sent ? "sent" : "skipped";
  }

  let emailsSent = 0;
  if (params.channels.includes("EMAIL") && recipients.length > 0) {
    const html = emailLayout(
      params.title,
      `<p style="white-space:pre-wrap">${escapeHtml(params.body)}</p>`
    );
    const result = await sendBulkEmail(
      recipients.map((u) => u.email),
      params.title,
      html
    );
    emailsSent = result.sent;
  }

  return { recipients: recipients.length, telegram, emailsSent };
}

/** Creates dashboard notifications for members when an active trade is updated. */
export async function notifyTradeUpdate(params: {
  tradeId: string;
  instrument: string;
  status: TradeStatus;
  message: string;
  isTrialVisible: boolean;
}): Promise<{ recipients: number }> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gte: new Date() },
      user: { isBanned: false }
    },
    select: { userId: true, planType: true },
    distinct: ["userId"]
  });

  const eligibleUserIds = subscriptions
    .filter((subscription) => params.isTrialVisible || subscription.planType !== "TRIAL")
    .map((subscription) => subscription.userId);

  if (eligibleUserIds.length === 0) {
    return { recipients: 0 };
  }

  const batchId = crypto.randomUUID();
  await prisma.notification.createMany({
    data: eligibleUserIds.map((userId) => ({
      userId,
      title: `Trade update: ${params.instrument}`,
      body: `${params.message} (Status: ${prettyTradeStatus(params.status)})`,
      channel: "DASHBOARD" as const,
      eventType: "TRADE_UPDATE",
      audience: "active_subscribers",
      batchId
    }))
  });

  const created = await prisma.notification.findMany({
    where: { batchId },
    select: { id: true, userId: true, title: true, body: true, createdAt: true }
  });
  for (const notification of created) {
    publishUserNotification(notification.userId, {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      createdAt: notification.createdAt.toISOString()
    });
  }

  return { recipients: eligibleUserIds.length };
}
