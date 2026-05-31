import { escapeHtml } from "@/lib/html";

type TelegramResult = { sent: boolean; skipped?: boolean };

/** Posts an HTML message to the configured Telegram channel. Skips when unconfigured. */
export async function sendTelegramMessage(params: {
  title: string;
  body: string;
}): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chatId) return { sent: false, skipped: true };

  const text = `<b>${escapeHtml(params.title)}</b>\n${escapeHtml(params.body)}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" })
    });
    return { sent: response.ok };
  } catch {
    return { sent: false };
  }
}
