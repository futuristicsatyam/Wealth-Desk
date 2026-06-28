"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { publishUserNotification } from "@/lib/live-notify";
import { broadcastNotification, notifyTradeUpdate } from "@/lib/notifications";
import { LOT_SIZE_SETTINGS_SLUG } from "@/lib/lot-sizes";
import {
  tradeInputSchema,
  tradeStatusSchema,
  outlookSchema,
  analystSchema,
  indexSchema,
  planSchema,
  broadcastSchema,
  managedContentSchema,
  firstError
} from "@/lib/validations";

export type ActionState = { status: "idle" | "error" | "success"; message: string };

async function clientIp(): Promise<string> {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function num(value: FormDataEntryValue | null): number {
  return Number(String(value ?? "").trim());
}

/* ----------------------------- Trades ----------------------------- */

export async function createTradeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const t3Raw = String(formData.get("target3") ?? "").trim();

  const parsed = tradeInputSchema.safeParse({
    analystId: formData.get("analystId"),
    indexId: formData.get("indexId"),
    instrument: formData.get("instrument"),
    segment: formData.get("segment"),
    tradeType: formData.get("tradeType"),
    entryPrice: num(formData.get("entryPrice")),
    stopLoss: num(formData.get("stopLoss")),
    target1: num(formData.get("target1")),
    target2: num(formData.get("target2")),
    target3: t3Raw ? Number(t3Raw) : undefined,
    riskRating: num(formData.get("riskRating")),
    rationale: formData.get("rationale"),
    chartImageUrl: formData.get("chartImageUrl") || "",
    isTrialVisible: formData.get("isTrialVisible") === "on"
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };

  const analyst = await prisma.analyst.findUnique({ where: { id: parsed.data.analystId } });
  if (!analyst) return { status: "error", message: "Selected analyst no longer exists" };

  const selectedIndex = await prisma.tradeIndex.findUnique({ where: { id: parsed.data.indexId } });
  if (!selectedIndex) return { status: "error", message: "Selected index no longer exists" };

  const trade = await prisma.trade.create({
    data: {
      analystId: parsed.data.analystId,
      indexId: parsed.data.indexId,
      instrument: parsed.data.instrument,
      segment: parsed.data.segment,
      tradeType: parsed.data.tradeType,
      entryPrice: parsed.data.entryPrice,
      stopLoss: parsed.data.stopLoss,
      target1: parsed.data.target1,
      target2: parsed.data.target2,
      target3: parsed.data.target3,
      riskRating: parsed.data.riskRating,
      rationale: parsed.data.rationale,
      chartImageUrl: parsed.data.chartImageUrl || null,
      isTrialVisible: parsed.data.isTrialVisible,
      status: "ACTIVE"
    }
  });

  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "TRADE_CREATED",
    entity: "Trade",
    entityId: trade.id,
    summary: `Published ${parsed.data.tradeType} ${parsed.data.instrument}`,
    metadata: { analyst: analyst.name, index: selectedIndex.name, lotSize: selectedIndex.lotSize },
    ipAddress: await clientIp()
  });

  revalidatePath("/admin/trades");
  return { status: "success", message: `Trade for ${parsed.data.instrument} published` };
}

export async function createTradeIndexAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = indexSchema.safeParse({
    name: formData.get("name"),
    lotSize: num(formData.get("lotSize"))
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };

  try {
    const index = await prisma.tradeIndex.create({
      data: { name: parsed.data.name.toUpperCase(), lotSize: parsed.data.lotSize }
    });

    await logAudit({
      actorId: admin.id,
      actorName: admin.name,
      action: "TRADE_INDEX_CREATED",
      entity: "TradeIndex",
      entityId: index.id,
      summary: `Created index ${index.name} (lot ${index.lotSize})`,
      ipAddress: await clientIp()
    });

    revalidatePath("/admin/trades");
    return { status: "success", message: `Index ${index.name} created` };
  } catch {
    return { status: "error", message: "An index with this name already exists" };
  }
}

export async function updateTradeStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = tradeStatusSchema.safeParse({
    tradeId: formData.get("tradeId"),
    status: formData.get("status"),
    updateMessage: formData.get("updateMessage") || undefined
  });
  if (!parsed.success) return;

  const existingTrade = await prisma.trade.findUnique({
    where: { id: parsed.data.tradeId },
    select: { id: true, instrument: true, status: true, isTrialVisible: true }
  });
  if (!existingTrade) return;

  const isClosed = parsed.data.status !== "ACTIVE";
  const updateMessage = parsed.data.updateMessage ?? `Status changed to ${parsed.data.status}`;
  await prisma.$transaction([
    prisma.trade.update({
      where: { id: parsed.data.tradeId },
      data: { status: parsed.data.status, closedAt: isClosed ? new Date() : null }
    }),
    prisma.tradeUpdate.create({
      data: {
        tradeId: parsed.data.tradeId,
        status: parsed.data.status,
        message: updateMessage
      }
    })
  ]);

  // Notify members on every real status change (e.g. ACTIVE -> TARGET1_HIT, and
  // also TARGET1_HIT -> TARGET2_HIT), or whenever an explicit update message was
  // provided. Previously this only fired for the first move away from ACTIVE,
  // so subscribers missed all subsequent updates.
  const statusChanged = parsed.data.status !== existingTrade.status;
  if (statusChanged || parsed.data.updateMessage) {
    await notifyTradeUpdate({
      tradeId: existingTrade.id,
      instrument: existingTrade.instrument,
      status: parsed.data.status,
      message: updateMessage,
      isTrialVisible: existingTrade.isTrialVisible
    });
  }

  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "TRADE_STATUS_UPDATED",
    entity: "Trade",
    entityId: parsed.data.tradeId,
    summary: `Trade status set to ${parsed.data.status}`,
    ipAddress: await clientIp()
  });
  revalidatePath("/admin/trades");
  revalidatePath("/dashboard/trades");
  revalidatePath("/dashboard/notifications");
}

/* ---------------------------- Outlooks ---------------------------- */

export async function createOutlookAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = outlookSchema.safeParse({
    analystId: formData.get("analystId"),
    nifty: formData.get("nifty"),
    bankNifty: formData.get("bankNifty"),
    volatility: formData.get("volatility"),
    globalCues: formData.get("globalCues"),
    sectorStrength: formData.get("sectorStrength"),
    institutionalSentiment: formData.get("institutionalSentiment")
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  try {
    const outlook = await prisma.marketOutlook.create({
      data: { ...parsed.data, date: today }
    });
    await logAudit({
      actorId: admin.id,
      actorName: admin.name,
      action: "OUTLOOK_CREATED",
      entity: "MarketOutlook",
      entityId: outlook.id,
      summary: `Published market outlook for ${today.toDateString()}`,
      ipAddress: await clientIp()
    });
    revalidatePath("/admin/outlooks");
    return { status: "success", message: "Market outlook published" };
  } catch {
    return { status: "error", message: "An outlook from this analyst already exists for today" };
  }
}

/* ---------------------------- Analysts ---------------------------- */

export async function createAnalystAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = analystSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    experienceYears: num(formData.get("experienceYears")),
    specialization: formData.get("specialization"),
    sebiRegistration: formData.get("sebiRegistration"),
    bio: formData.get("bio"),
    isActive: formData.get("isActive") !== "false"
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };

  try {
    const analyst = await prisma.analyst.create({ data: parsed.data });
    await logAudit({
      actorId: admin.id,
      actorName: admin.name,
      action: "ANALYST_CREATED",
      entity: "Analyst",
      entityId: analyst.id,
      summary: `Added analyst ${parsed.data.name}`,
      ipAddress: await clientIp()
    });
    revalidatePath("/admin/analysts");
    return { status: "success", message: `Analyst ${parsed.data.name} added` };
  } catch {
    return { status: "error", message: "An analyst with this email already exists" };
  }
}

export async function toggleAnalystActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const analystId = String(formData.get("analystId") ?? "");
  const analyst = await prisma.analyst.findUnique({ where: { id: analystId } });
  if (!analyst) return;

  await prisma.analyst.update({ where: { id: analystId }, data: { isActive: !analyst.isActive } });
  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "ANALYST_TOGGLED",
    entity: "Analyst",
    entityId: analystId,
    summary: `${analyst.isActive ? "Deactivated" : "Activated"} analyst ${analyst.name}`,
    ipAddress: await clientIp()
  });
  revalidatePath("/admin/analysts");
}

/* ------------------------------ Users ----------------------------- */

export async function updateUserRoleAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!["USER", "ANALYST", "ADMIN"].includes(role)) return;

  // Guard 1: an admin cannot change their own role (prevents self-lockout).
  if (userId === admin.id) return;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role === role) return;

  // Guard 2: never remove the last remaining admin.
  if (target.role === "ADMIN" && role !== "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", isBanned: false, id: { not: userId } }
    });
    if (otherAdmins === 0) return;
  }

  await prisma.user.update({ where: { id: userId }, data: { role: role as never } });
  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "USER_ROLE_CHANGED",
    entity: "User",
    entityId: userId,
    summary: `Changed role of ${target.name} from ${target.role} to ${role}`,
    ipAddress: await clientIp()
  });
  revalidatePath("/admin/users");
}

export async function toggleUserBanAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  // Guard: an admin can never ban themselves.
  if (userId === admin.id) return;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;

  // Guard: do not ban the last non-banned admin.
  if (!target.isBanned && target.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", isBanned: false, id: { not: userId } }
    });
    if (otherAdmins === 0) return;
  }

  const reason = String(formData.get("reason") ?? "").trim() || null;
  await prisma.user.update({
    where: { id: userId },
    data: { isBanned: !target.isBanned, bannedReason: target.isBanned ? null : reason }
  });
  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: target.isBanned ? "USER_UNBANNED" : "USER_BANNED",
    entity: "User",
    entityId: userId,
    summary: `${target.isBanned ? "Reinstated" : "Suspended"} ${target.name}`,
    metadata: reason ? { reason } : undefined,
    ipAddress: await clientIp()
  });
  revalidatePath("/admin/users");
}

/* ------------------------------ Plans ----------------------------- */

export async function createPlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const features = String(formData.get("features") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = planSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    planType: formData.get("planType"),
    amountRupees: num(formData.get("amountRupees")),
    durationDays: num(formData.get("durationDays")),
    features,
    sortOrder: num(formData.get("sortOrder")) || 0,
    isActive: formData.get("isActive") !== "false"
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };

  try {
    const plan = await prisma.planConfig.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description,
        amountPaise: parsed.data.amountRupees * 100,
        durationDays: parsed.data.durationDays,
        isTrial: parsed.data.planType === "TRIAL",
        isActive: parsed.data.isActive,
        features: parsed.data.features,
        sortOrder: parsed.data.sortOrder
      }
    });
    await logAudit({
      actorId: admin.id,
      actorName: admin.name,
      action: "PLAN_CREATED",
      entity: "PlanConfig",
      entityId: plan.id,
      summary: `Created plan ${parsed.data.name} (${parsed.data.code})`,
      ipAddress: await clientIp()
    });
    revalidatePath("/admin/plans");
    revalidatePath("/membership");
    return { status: "success", message: `Plan ${parsed.data.name} created` };
  } catch {
    return { status: "error", message: "A plan with this code already exists" };
  }
}

export async function updatePlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const planId = String(formData.get("planId") ?? "").trim();
  if (!planId) return { status: "error", message: "Missing plan reference" };

  const features = String(formData.get("features") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = planSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    planType: formData.get("planType"),
    amountRupees: num(formData.get("amountRupees")),
    durationDays: num(formData.get("durationDays")),
    features,
    sortOrder: num(formData.get("sortOrder")) || 0,
    // Preserve the current visibility (managed via the Show/Hide toggle).
    isActive: formData.get("isActive") !== "false"
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };

  try {
    const plan = await prisma.planConfig.update({
      where: { id: planId },
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        amountPaise: parsed.data.amountRupees * 100,
        durationDays: parsed.data.durationDays,
        isTrial: parsed.data.planType === "TRIAL",
        isActive: parsed.data.isActive,
        features: parsed.data.features,
        sortOrder: parsed.data.sortOrder
      }
    });
    await logAudit({
      actorId: admin.id,
      actorName: admin.name,
      action: "PLAN_UPDATED",
      entity: "PlanConfig",
      entityId: plan.id,
      summary: `Updated plan ${parsed.data.name} (${parsed.data.code})`,
      ipAddress: await clientIp()
    });
    revalidatePath("/admin/plans");
    revalidatePath("/membership");
    return { status: "success", message: `Plan ${parsed.data.name} updated` };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return { status: "error", message: "Another plan already uses this code" };
      if (error.code === "P2025") return { status: "error", message: "This plan no longer exists" };
    }
    return { status: "error", message: "Could not update the plan" };
  }
}

export async function togglePlanActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const planId = String(formData.get("planId") ?? "");
  const plan = await prisma.planConfig.findUnique({ where: { id: planId } });
  if (!plan) return;

  await prisma.planConfig.update({ where: { id: planId }, data: { isActive: !plan.isActive } });
  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "PLAN_TOGGLED",
    entity: "PlanConfig",
    entityId: planId,
    summary: `${plan.isActive ? "Disabled" : "Enabled"} plan ${plan.name}`,
    ipAddress: await clientIp()
  });
  revalidatePath("/admin/plans");
  revalidatePath("/membership");
}

/* -------------------------- Notifications ------------------------- */

export async function broadcastNotificationAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();
  const channels = formData.getAll("channels").map(String);

  const parsed = broadcastSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    eventType: formData.get("eventType") || "MANUAL_BROADCAST",
    audience: formData.get("audience") || "all",
    channels
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };

  const result = await broadcastNotification(parsed.data);
  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "NOTIFICATION_BROADCAST",
    entity: "Notification",
    entityId: "broadcast",
    summary: `Broadcast "${parsed.data.title}" to ${result.recipients} members`,
    metadata: { channels: parsed.data.channels, emailsSent: result.emailsSent },
    ipAddress: await clientIp()
  });

  revalidatePath("/admin/notifications");
  return {
    status: "success",
    message: `Broadcast sent to ${result.recipients} members (emails: ${result.emailsSent}, telegram: ${result.telegram}).`
  };
}

/* ----------------------------- Content ---------------------------- */

export async function updateManagedContentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = managedContentSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    body: formData.get("body")
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };
  const { slug, title, body } = parsed.data;

  await prisma.managedContent.upsert({
    where: { slug },
    create: { slug, title, body },
    update: { title, body }
  });
  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "CONTENT_UPDATED",
    entity: "ManagedContent",
    entityId: slug,
    summary: `Updated content "${slug}"`,
    ipAddress: await clientIp()
  });

  revalidatePath("/admin/content");
  if (slug.startsWith("legal:")) revalidatePath(`/legal/${slug.replace("legal:", "")}`);
  if (slug === LOT_SIZE_SETTINGS_SLUG) revalidatePath("/dashboard/history");
  return { status: "success", message: "Content saved" };
}

/* --------------------------- Support ------------------------------ */

export async function resolveSupportTicketAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const ticketId = String(formData.get("ticketId") ?? "");
  const response = String(formData.get("response") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "RESOLVED");
  if (!["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(status)) return;

  const existingTicket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, userId: true, subject: true, status: true, response: true }
  });
  if (!existingTicket) return;

  const statusChanged = existingTicket.status !== status;
  const responseChanged = (existingTicket.response ?? "") !== (response ?? "");

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: status as never, response }
  });

  if (statusChanged || responseChanged) {
    const notification = await prisma.notification.create({
      data: {
        userId: existingTicket.userId,
        title: `Support update: ${existingTicket.subject}`,
        body: response
          ? `Your ticket is now ${status.replace(/_/g, " ").toLowerCase()}. Response: ${response}`
          : `Your ticket is now ${status.replace(/_/g, " ").toLowerCase()}.`,
        channel: "DASHBOARD",
        eventType: "SUPPORT_TICKET_UPDATED",
        audience: "self"
      }
    });

    publishUserNotification(existingTicket.userId, {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      createdAt: notification.createdAt.toISOString()
    });
  }

  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "TICKET_UPDATED",
    entity: "SupportTicket",
    entityId: ticketId,
    summary: `Support ticket marked ${status}`,
    ipAddress: await clientIp()
  });
  revalidatePath("/admin/support");
  revalidatePath("/dashboard/support");
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}
