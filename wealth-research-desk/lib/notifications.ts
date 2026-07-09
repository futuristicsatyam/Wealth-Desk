import crypto from "crypto";
import type { TradeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishUserNotification } from "@/lib/live-notify";
import { sendBulkEmail, emailLayout } from "@/lib/email";
import { sendTelegramMessage, sendTelegramDirectBulk } from "@/lib/telegram";
import { escapeHtml } from "@/lib/html";

type Channel = "DASHBOARD" | "EMAIL" | "TELEGRAM";

/** Creates DASHBOARD notifications for a set of users and pushes them live. */
async function createDashboardNotifications(
  userIds: string[],
  payload: { title: string; body: string; eventType: string; audience: string }
): Promise<void> {
  if (userIds.length === 0) return;
  const batchId = crypto.randomUUID();
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title: payload.title,
      body: payload.body,
      channel: "DASHBOARD" as const,
      eventType: payload.eventType,
      audience: payload.audience,
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

/**
 * Fans out a NEWLY PUBLISHED trade:
 *   - Dashboard notification to every active member (trial members only when
 *     the trade is trial-visible) — this is the baseline everyone gets.
 *   - Telegram DM to members whose active plan has the `telegramAlerts` perk
 *     AND who have linked their Telegram — the special, plan-gated feature.
 * Dead chats (member blocked/deleted the bot) are unlinked so we stop retrying.
 */
export async function notifyNewTrade(params: {
  tradeId: string;
  instrument: string;
  segment: string;
  tradeType: "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3?: number | null;
  isTrialVisible: boolean;
}): Promise<{ dashboardRecipients: number; telegramSent: number }> {
  const now = new Date();

  // --- Dashboard: all active members (trial only if the trade is visible) ---
  const activeSubs = await prisma.subscription.findMany({
    where: { status: "ACTIVE", endDate: { gte: now }, user: { isBanned: false } },
    select: { userId: true, planType: true },
    distinct: ["userId"]
  });
  const dashboardUserIds = activeSubs
    .filter((sub) => params.isTrialVisible || sub.planType !== "TRIAL")
    .map((sub) => sub.userId);

  const dashboardTitle = `New trade: ${params.instrument}`;
  const dashboardBody = `A new ${params.tradeType} setup on ${params.instrument} (${params.segment}) has been published. Open your dashboard for entry, stop-loss, targets and the full rationale.`;
  await createDashboardNotifications(dashboardUserIds, {
    title: dashboardTitle,
    body: dashboardBody,
    eventType: "TRADE_PUBLISHED",
    audience: "active_subscribers"
  });

  // --- Telegram: members on a telegram-enabled plan who have linked a chat ---
  const telegramPlans = await prisma.planConfig.findMany({
    where: { telegramAlerts: true },
    select: { code: true }
  });
  const eligibleCodes = telegramPlans.map((plan) => plan.code);

  let telegramSent = 0;
  if (eligibleCodes.length > 0) {
    const linkedMembers = await prisma.user.findMany({
      where: {
        isBanned: false,
        telegramChatId: { not: null },
        subscriptions: {
          some: {
            status: "ACTIVE",
            endDate: { gte: now },
            planCode: { in: eligibleCodes },
            ...(params.isTrialVisible ? {} : { planType: { not: "TRIAL" } })
          }
        }
      },
      select: { id: true, telegramChatId: true }
    });

    const chatIds = linkedMembers.map((m) => m.telegramChatId).filter((id): id is string => Boolean(id));
    if (chatIds.length > 0) {
      const lines = [
        `${params.tradeType} · ${params.instrument} (${params.segment})`,
        `Entry: ${params.entry}`,
        `Stop-loss: ${params.stopLoss}`,
        `Target 1: ${params.target1}`,
        `Target 2: ${params.target2}`,
        ...(params.target3 != null ? [`Target 3: ${params.target3}`] : []),
        "",
        "Full rationale on your dashboard."
      ];
      const result = await sendTelegramDirectBulk(chatIds, {
        title: `📈 New trade: ${params.instrument}`,
        body: lines.join("\n")
      });
      telegramSent = result.sent;

      if (result.blockedChatIds.length > 0) {
        await prisma.user.updateMany({
          where: { telegramChatId: { in: result.blockedChatIds } },
          data: { telegramChatId: null, telegramLinkedAt: null }
        });
      }
    }
  }

  return { dashboardRecipients: dashboardUserIds.length, telegramSent };
}
