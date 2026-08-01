"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { consumeRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import {
  supportTicketSchema,
  changePasswordSchema,
  reviewSubmitSchema,
  videoTestimonialSubmitSchema,
  firstError
} from "@/lib/validations";
import { parseVideoUrl } from "@/lib/video-embed";
import { telegramConnectLink } from "@/lib/telegram";

export type ActionState = { status: "idle" | "error" | "success"; message: string };

export type TelegramLinkState = { status: "idle" | "error" | "success"; message: string; link?: string };

async function clientIp(): Promise<string> {
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Lets a signed-in member change their password. Verifies the current password,
 * then sets the new hash and bumps `sessionVersion` so every existing session
 * (this browser and any others) is invalidated — the member must sign back in.
 */
export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });
  if (!parsed.success) {
    return { status: "error", message: firstError(parsed.error) };
  }

  const ip = await clientIp();
  const limit = await consumeRateLimit(`pwchange:${user.id}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return { status: "error", message: "Too many attempts. Please try again later." };
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { status: "error", message: "Your current password is incorrect." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, sessionVersion: { increment: 1 } }
  });

  await logAudit({
    actorId: user.id,
    actorName: user.name,
    action: "PASSWORD_CHANGED",
    entity: "User",
    entityId: user.id,
    summary: `${user.name} changed their password`,
    ipAddress: ip
  });

  return { status: "success", message: "Password updated. Sign in again with your new password." };
}

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
export async function createTelegramLinkAction(): Promise<TelegramLinkState> {
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

/**
 * Member submits (or updates) their own review from the dashboard. It's stored
 * against their account (one per member) and always lands UNPUBLISHED — an admin
 * must verify it before it appears on the home page. Editing an already-approved
 * review re-queues it for verification.
 */
export async function submitReviewAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = reviewSubmitSchema.safeParse({
    quote: formData.get("quote"),
    authorRole: formData.get("authorRole") || undefined,
    rating: formData.get("rating") ? Number(formData.get("rating")) : undefined
  });
  if (!parsed.success) {
    return { status: "error", message: firstError(parsed.error) };
  }

  await prisma.review.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      authorName: user.name,
      authorRole: parsed.data.authorRole ?? null,
      quote: parsed.data.quote,
      rating: parsed.data.rating ?? null,
      isPublished: false
    },
    update: {
      authorName: user.name,
      authorRole: parsed.data.authorRole ?? null,
      quote: parsed.data.quote,
      rating: parsed.data.rating ?? null,
      // Any edit re-enters the verification queue.
      isPublished: false
    }
  });

  revalidatePath("/dashboard/reviews");
  revalidatePath("/admin/reviews");
  revalidatePath("/");
  return {
    status: "success",
    message: "Thanks! Your review was submitted and will appear once our team approves it."
  };
}

export async function submitVideoTestimonialAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = videoTestimonialSubmitSchema.safeParse({
    sourceUrl: formData.get("sourceUrl"),
    authorRole: formData.get("authorRole") || undefined
  });
  if (!parsed.success) {
    return { status: "error", message: firstError(parsed.error) };
  }

  const video = parseVideoUrl(parsed.data.sourceUrl);
  if (!video) {
    return {
      status: "error",
      message: "Unsupported link. Paste a YouTube or Instagram video/reel URL."
    };
  }

  await prisma.videoTestimonial.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      authorName: user.name,
      authorRole: parsed.data.authorRole ?? null,
      provider: video.provider,
      sourceUrl: video.sourceUrl,
      embedUrl: video.embedUrl,
      isPublished: false
    },
    update: {
      authorName: user.name,
      authorRole: parsed.data.authorRole ?? null,
      provider: video.provider,
      sourceUrl: video.sourceUrl,
      embedUrl: video.embedUrl,
      // Any edit re-enters the verification queue.
      isPublished: false
    }
  });

  revalidatePath("/dashboard/reviews");
  revalidatePath("/admin/reviews");
  revalidatePath("/");
  return {
    status: "success",
    message: "Thanks! Your video reel was submitted and will appear once our team approves it."
  };
}
