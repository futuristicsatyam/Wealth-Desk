import type { OutboundChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendTelegramDirect } from "@/lib/telegram";
import { sendEmail, emailLayout } from "@/lib/email";
import { escapeHtml } from "@/lib/html";

const MAX_ATTEMPTS = 4;

export type OutboundInput = {
  channel: OutboundChannel;
  target: string;
  title: string;
  body: string;
  batchId?: string;
};

/** Queues outbound messages for the cron dispatcher. A single bulk insert. */
export async function enqueueOutbound(messages: OutboundInput[]): Promise<number> {
  if (messages.length === 0) return 0;
  const result = await prisma.outboundMessage.createMany({
    data: messages.map((message) => ({
      channel: message.channel,
      target: message.target,
      title: message.title,
      body: message.body,
      batchId: message.batchId ?? null
    }))
  });
  return result.count;
}

/**
 * Sends up to `limit` pending messages, oldest first. Idempotent-ish: each row
 * is marked SENT/FAILED as it's processed, so overlapping runs at worst resend a
 * row that was mid-flight. Telegram 403s (member blocked the bot) unlink that
 * chat so we stop trying. Returns per-run counters.
 */
export async function drainOutbound(limit = 200): Promise<{ processed: number; sent: number; failed: number }> {
  const pending = await prisma.outboundMessage.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit
  });

  let sent = 0;
  let failed = 0;
  const CONCURRENCY = 20;

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (message) => {
        let ok = false;
        let blocked = false;
        let error: string | undefined;

        try {
          if (message.channel === "TELEGRAM") {
            const result = await sendTelegramDirect(message.target, {
              title: message.title,
              body: message.body
            });
            ok = result.sent;
            blocked = Boolean(result.blocked);
          } else {
            const html = emailLayout(
              message.title,
              `<p style="white-space:pre-wrap">${escapeHtml(message.body)}</p>`
            );
            const result = await sendEmail({ to: message.target, subject: message.title, html });
            ok = result.sent || Boolean(result.skipped); // "skipped" = SMTP off; don't retry forever
            error = result.error;
          }
        } catch (err) {
          error = err instanceof Error ? err.message : "send failed";
        }

        const attempts = message.attempts + 1;
        if (ok) {
          sent += 1;
          await prisma.outboundMessage.update({
            where: { id: message.id },
            data: { status: "SENT", attempts, sentAt: new Date() }
          });
        } else {
          failed += 1;
          // Give up after MAX_ATTEMPTS or when the recipient blocked the bot.
          const giveUp = blocked || attempts >= MAX_ATTEMPTS;
          await prisma.outboundMessage.update({
            where: { id: message.id },
            data: {
              status: giveUp ? "FAILED" : "PENDING",
              attempts,
              lastError: blocked ? "blocked" : error ?? "send failed"
            }
          });
          if (blocked) {
            await prisma.user.updateMany({
              where: { telegramChatId: message.target },
              data: { telegramChatId: null, telegramLinkedAt: null }
            });
          }
        }
      })
    );
  }

  return { processed: pending.length, sent, failed };
}
