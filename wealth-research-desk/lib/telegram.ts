import { escapeHtml } from "@/lib/html";

type TelegramResult = { sent: boolean; skipped?: boolean };

/** True when the bot token is configured — the minimum needed to send anything. */
export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/** The bot's @username, used to build the `t.me/<bot>?start=<token>` connect link. */
export function telegramBotUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") || null;
}

/** Builds the one-tap connect deep-link a member taps to bind their chat. */
export function telegramConnectLink(linkToken: string): string | null {
  const username = telegramBotUsername();
  if (!username) return null;
  return `https://t.me/${username}?start=${encodeURIComponent(linkToken)}`;
}

function renderText(title: string, body: string): string {
  return `<b>${escapeHtml(title)}</b>\n${escapeHtml(body)}`;
}

/** Posts an HTML message to the configured Telegram channel. Skips when unconfigured. */
export async function sendTelegramMessage(params: {
  title: string;
  body: string;
}): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chatId) return { sent: false, skipped: true };

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: renderText(params.title, params.body), parse_mode: "HTML" })
    });
    return { sent: response.ok };
  } catch {
    return { sent: false };
  }
}

type DirectResult = { sent: boolean; skipped?: boolean; blocked?: boolean };

/**
 * Sends a direct message to a single member's chat.
 * `blocked` is true when Telegram reports the user has blocked or deleted the
 * bot (403) — the caller should unlink that chatId so we stop trying.
 */
export async function sendTelegramDirect(
  chatId: string,
  params: { title: string; body: string }
): Promise<DirectResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { sent: false, skipped: true };

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: renderText(params.title, params.body), parse_mode: "HTML" })
    });
    if (response.ok) return { sent: true };
    // 403 = bot blocked / chat not found; anything else is a transient failure.
    return { sent: false, blocked: response.status === 403 };
  } catch {
    return { sent: false };
  }
}

/**
 * Fan-out DM send. Runs in small concurrent batches to respect Telegram's
 * ~30 msg/sec limit. Returns how many were delivered and which chatIds are
 * dead (blocked/deleted the bot) so the caller can unlink them.
 */
export async function sendTelegramDirectBulk(
  chatIds: string[],
  params: { title: string; body: string }
): Promise<{ sent: number; blockedChatIds: string[] }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || chatIds.length === 0) return { sent: 0, blockedChatIds: [] };

  let sent = 0;
  const blockedChatIds: string[] = [];
  const BATCH = 25;
  for (let i = 0; i < chatIds.length; i += BATCH) {
    const batch = chatIds.slice(i, i + BATCH);
    const results = await Promise.all(batch.map((chatId) => sendTelegramDirect(chatId, params)));
    results.forEach((result, index) => {
      if (result.sent) sent += 1;
      else if (result.blocked) blockedChatIds.push(batch[index]);
    });
  }
  return { sent, blockedChatIds };
}
