import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendBulkEmail, emailLayout } from "@/lib/email";
import { sendTelegramMessage } from "@/lib/telegram";
import { escapeHtml } from "@/lib/html";

type Channel = "DASHBOARD" | "EMAIL" | "TELEGRAM";

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
