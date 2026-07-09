import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramDirect } from "@/lib/telegram";

export const dynamic = "force-dynamic";

// Telegram delivers bot updates here. We only care about text commands:
//   /start <linkToken>  -> bind this chat to the member who owns the token
//   /stop               -> unlink this chat
// The endpoint is protected by a secret path token Telegram echoes back in the
// `X-Telegram-Bot-Api-Secret-Token` header (set when the webhook is registered).

type TelegramChat = { id: number };
type TelegramMessage = { text?: string; chat?: TelegramChat };
type TelegramUpdate = { message?: TelegramMessage };

async function reply(chatId: number, title: string, body: string): Promise<void> {
  await sendTelegramDirect(String(chatId), { title, body });
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  const chatId = message?.chat?.id;
  const text = message?.text?.trim();
  // Always ack with 200 so Telegram doesn't retry non-actionable updates.
  if (!chatId || !text) return NextResponse.json({ ok: true });

  if (text === "/stop" || text === "/unlink") {
    await prisma.user.updateMany({
      where: { telegramChatId: String(chatId) },
      data: { telegramChatId: null, telegramLinkedAt: null }
    });
    await reply(chatId, "Alerts stopped", "You will no longer receive trade alerts here. Reconnect any time from your dashboard.");
    return NextResponse.json({ ok: true });
  }

  const startMatch = /^\/start(?:\s+(\S+))?$/.exec(text);
  if (startMatch) {
    const linkToken = startMatch[1];
    if (!linkToken) {
      await reply(chatId, "Wealth Research Desk", "To receive trade alerts here, open your dashboard and tap “Connect Telegram” — that link binds this chat to your account.");
      return NextResponse.json({ ok: true });
    }

    const owner = await prisma.user.findUnique({
      where: { telegramLinkToken: linkToken },
      select: { id: true }
    });
    if (!owner) {
      await reply(chatId, "Link expired", "That connect link is no longer valid. Generate a fresh one from your dashboard and try again.");
      return NextResponse.json({ ok: true });
    }

    // Bind the chat to the owner. Free the chatId from any other account first
    // (re-link / shared device), then claim it and burn the one-time token.
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { telegramChatId: String(chatId), id: { not: owner.id } },
        data: { telegramChatId: null, telegramLinkedAt: null }
      }),
      prisma.user.update({
        where: { id: owner.id },
        data: {
          telegramChatId: String(chatId),
          telegramLinkedAt: new Date(),
          telegramLinkToken: null
        }
      })
    ]);

    await reply(chatId, "Telegram connected ✅", "You are all set. New trade alerts for your plan will arrive right here. Send /stop any time to turn them off.");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
