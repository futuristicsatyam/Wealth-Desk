"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { supportTicketSchema, firstError } from "@/lib/validations";
import { telegramConnectLink } from "@/lib/telegram";

export type ActionState = { status: "idle" | "error" | "success"; message: string };

export type TelegramLinkState = { status: "idle" | "error" | "success"; message: string; link?: string };

/** Member raises a support ticket (fixes the previously non-functional form). */
export async function createSupportTicketAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = supportTicketSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
    priority: formData.get("priority")
  });
  if (!parsed.success) {
    return { status: "error", message: firstError(parsed.error) };
  }

  await prisma.supportTicket.create({
    data: {
      userId: user.id,
      subject: parsed.data.subject,
      message: parsed.data.message,
      priority: parsed.data.priority,
      status: "OPEN"
    }
  });

  revalidatePath("/dashboard/support");
  revalidatePath("/admin/support");
  redirect("/dashboard/support?submitted=1");
}

/** Marks every unread notification for the current user as read. */
export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true, readAt: new Date() }
  });
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}

/**
 * Issues a fresh, one-time Telegram connect link for the current member. The
 * token is stored on the user and burned by the bot webhook once the chat is
 * bound. Generating a new link overwrites (and thus invalidates) any prior one.
 */
export async function createTelegramLinkAction(
  _prev: TelegramLinkState,
  _formData: FormData
): Promise<TelegramLinkState> {
  const user = await requireUser();

  const linkToken = crypto.randomBytes(24).toString("base64url");
  const link = telegramConnectLink(linkToken);
  if (!link) {
    return { status: "error", message: "Telegram alerts aren’t configured yet. Please contact support." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { telegramLinkToken: linkToken }
  });

  return { status: "success", message: "Tap the button below to open Telegram and confirm.", link };
}

/** Unlinks the member's Telegram chat so alerts stop. */
export async function disconnectTelegramAction(): Promise<void> {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { telegramChatId: null, telegramLinkedAt: null, telegramLinkToken: null }
  });
  revalidatePath("/dashboard/notifications");
}
