"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { after } from "next/server";
import { broadcastNotification, notifyTradeUpdate, notifyNewTrade } from "@/lib/notifications";
import { drainOutbound } from "@/lib/outbound";
import {
  tradeInputSchema,
  tradeStatusSchema,
  outlookSchema,
  analystSchema,
  indexSchema,
  planSchema,
  couponSchema,
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

/** URL-safe, unguessable token embedded in a private plan's access link. */
function generateAccessToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/** Reads an optional positive integer form field; returns undefined when blank. */
function optionalInt(value: FormDataEntryValue | null): number | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
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

  // Attribution is optional; only validate the analyst when one was chosen.
  let analyst = null;
  if (parsed.data.analystId) {
    analyst = await prisma.analyst.findUnique({ where: { id: parsed.data.analystId } });
    if (!analyst) return { status: "error", message: "Selected analyst no longer exists" };
  }

  const selectedIndex = await prisma.tradeIndex.findUnique({ where: { id: parsed.data.indexId } });
  if (!selectedIndex) return { status: "error", message: "Selected index no longer exists" };

  const trade = await prisma.trade.create({
    data: {
      analystId: parsed.data.analystId ?? null,
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
    metadata: { analyst: analyst?.name ?? "Unattributed", index: selectedIndex.name, lotSize: selectedIndex.lotSize },
    ipAddress: await clientIp()
  });

  // Fan out: dashboard notification to every active member + Telegram DM to
  // members on a telegram-enabled plan. Never let a delivery hiccup fail the
  // publish — the trade is already saved.
  try {
    await notifyNewTrade({
      tradeId: trade.id,
      instrument: parsed.data.instrument,
      segment: parsed.data.segment,
      tradeType: parsed.data.tradeType,
      entry: parsed.data.entryPrice,
      stopLoss: parsed.data.stopLoss,
      target1: parsed.data.target1,
      target2: parsed.data.target2,
      target3: parsed.data.target3 ?? null,
      isTrialVisible: parsed.data.isTrialVisible
    });
  } catch (error) {
    console.error("[createTradeAction] notifyNewTrade failed", error);
  }

  // Kick an immediate best-effort drain of the outbox after the response is
  // sent, so linked members get their Telegram DM within seconds; the cron
  // dispatcher is the safety net for anything not sent here.
  after(() => drainOutbound().catch(() => {}));

  revalidatePath("/admin/trades");
  revalidatePath("/dashboard/notifications");
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
      data: { ...parsed.data, analystId: parsed.data.analystId ?? null, date: today }
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
  if (!["USER", "ANALYST", "ADMIN"].includes(role)) redirect("/admin/users?error=invalid_role");

  // Guard 1: an admin cannot change their own role (prevents self-lockout).
  if (userId === admin.id) redirect("/admin/users?error=self_role");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) redirect("/admin/users?error=not_found");
  if (target.role === role) return; // no-op: already this role

  // Guard 2: never remove the last remaining admin.
  if (target.role === "ADMIN" && role !== "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", isBanned: false, id: { not: userId } }
    });
    if (otherAdmins === 0) redirect("/admin/users?error=last_admin");
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
  if (userId === admin.id) redirect("/admin/users?error=self_ban");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) redirect("/admin/users?error=not_found");

  // Guard: do not ban the last non-banned admin.
  if (!target.isBanned && target.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", isBanned: false, id: { not: userId } }
    });
    if (otherAdmins === 0) redirect("/admin/users?error=last_admin");
  }

  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500) || null;
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

  const isPrivate = formData.get("isPrivate") === "true";

  const parsed = planSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    planType: formData.get("planType"),
    amountRupees: num(formData.get("amountRupees")),
    durationDays: num(formData.get("durationDays")),
    referralBonusDays: num(formData.get("referralBonusDays")) || 0,
    telegramAlerts: formData.get("telegramAlerts") === "true",
    features,
    sortOrder: num(formData.get("sortOrder")) || 0,
    isActive: formData.get("isActive") !== "false",
    isPrivate,
    maxRedemptions: optionalInt(formData.get("maxRedemptions"))
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
        referralBonusDays: parsed.data.referralBonusDays,
        telegramAlerts: parsed.data.telegramAlerts,
        isTrial: parsed.data.planType === "TRIAL",
        isActive: parsed.data.isActive,
        features: parsed.data.features,
        sortOrder: parsed.data.sortOrder,
        isPrivate: parsed.data.isPrivate,
        // Private plans get a fresh access token; public plans get none.
        accessToken: parsed.data.isPrivate ? generateAccessToken() : null,
        maxRedemptions: parsed.data.isPrivate ? parsed.data.maxRedemptions ?? null : null
      }
    });
    await logAudit({
      actorId: admin.id,
      actorName: admin.name,
      action: "PLAN_CREATED",
      entity: "PlanConfig",
      entityId: plan.id,
      summary: `Created ${parsed.data.isPrivate ? "private " : ""}plan ${parsed.data.name} (${parsed.data.code})`,
      ipAddress: await clientIp()
    });
    revalidatePath("/admin/plans");
    revalidatePath("/membership");
    return {
      status: "success",
      message: parsed.data.isPrivate
        ? `Private plan ${parsed.data.name} created — copy its access link below`
        : `Plan ${parsed.data.name} created`
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", message: "A plan with this code already exists" };
    }
    console.error("[createPlanAction] failed", error);
    return { status: "error", message: "Could not create the plan" };
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

  const isPrivate = formData.get("isPrivate") === "true";
  const regenerateToken = formData.get("regenerateToken") === "true";

  const parsed = planSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    planType: formData.get("planType"),
    amountRupees: num(formData.get("amountRupees")),
    durationDays: num(formData.get("durationDays")),
    referralBonusDays: num(formData.get("referralBonusDays")) || 0,
    telegramAlerts: formData.get("telegramAlerts") === "true",
    features,
    sortOrder: num(formData.get("sortOrder")) || 0,
    // Preserve the current visibility (managed via the Show/Hide toggle).
    isActive: formData.get("isActive") !== "false",
    isPrivate,
    maxRedemptions: optionalInt(formData.get("maxRedemptions"))
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };

  const existing = await prisma.planConfig.findUnique({
    where: { id: planId },
    select: { accessToken: true }
  });
  if (!existing) return { status: "error", message: "This plan no longer exists" };

  // Token lifecycle: public plans have none; private plans keep their existing
  // token unless one is missing or an explicit regeneration was requested.
  let accessToken: string | null = null;
  if (parsed.data.isPrivate) {
    accessToken = regenerateToken || !existing.accessToken ? generateAccessToken() : existing.accessToken;
  }

  try {
    const plan = await prisma.planConfig.update({
      where: { id: planId },
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        amountPaise: parsed.data.amountRupees * 100,
        durationDays: parsed.data.durationDays,
        referralBonusDays: parsed.data.referralBonusDays,
        telegramAlerts: parsed.data.telegramAlerts,
        isTrial: parsed.data.planType === "TRIAL",
        isActive: parsed.data.isActive,
        features: parsed.data.features,
        sortOrder: parsed.data.sortOrder,
        isPrivate: parsed.data.isPrivate,
        accessToken,
        maxRedemptions: parsed.data.isPrivate ? parsed.data.maxRedemptions ?? null : null
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
    console.error("[updatePlanAction] failed", error);
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

/* ----------------------------- Coupons ---------------------------- */

export async function createCouponAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const planCodes = String(formData.get("planCodes") ?? "")
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
  const expiresRaw = String(formData.get("expiresAt") ?? "").trim();

  const parsed = couponSchema.safeParse({
    code: formData.get("code"),
    description: formData.get("description") || undefined,
    discountType: formData.get("discountType"),
    discountValue: num(formData.get("discountValue")),
    maxRedemptions: optionalInt(formData.get("maxRedemptions")),
    perUserLimit: num(formData.get("perUserLimit")) || 1,
    minAmountRupees: num(formData.get("minAmountRupees")) || 0,
    planCodes,
    expiresAt: expiresRaw || undefined,
    isActive: true
  });
  if (!parsed.success) return { status: "error", message: firstError(parsed.error) };

  // FLAT discounts are entered in rupees → store paise; PERCENT stays a percent.
  const discountValue =
    parsed.data.discountType === "FLAT" ? parsed.data.discountValue * 100 : parsed.data.discountValue;

  // Expiry is the END of the chosen day.
  let expiresAt: Date | null = null;
  if (parsed.data.expiresAt) {
    const parsedDate = new Date(`${parsed.data.expiresAt}T23:59:59.999`);
    if (Number.isNaN(parsedDate.getTime())) {
      return { status: "error", message: "Invalid expiry date" };
    }
    expiresAt = parsedDate;
  }

  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: parsed.data.code,
        description: parsed.data.description ?? null,
        discountType: parsed.data.discountType,
        discountValue,
        maxRedemptions: parsed.data.maxRedemptions ?? null,
        perUserLimit: parsed.data.perUserLimit,
        minAmountPaise: parsed.data.minAmountRupees * 100,
        planCodes: parsed.data.planCodes,
        expiresAt,
        isActive: parsed.data.isActive
      }
    });
    await logAudit({
      actorId: admin.id,
      actorName: admin.name,
      action: "COUPON_CREATED",
      entity: "Coupon",
      entityId: coupon.id,
      summary: `Created coupon ${parsed.data.code}`,
      ipAddress: await clientIp()
    });
    revalidatePath("/admin/coupons");
    return { status: "success", message: `Coupon ${parsed.data.code} created` };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", message: "A coupon with this code already exists" };
    }
    console.error("[createCouponAction] failed", error);
    return { status: "error", message: "Could not create the coupon" };
  }
}

export async function toggleCouponActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const couponId = String(formData.get("couponId") ?? "").trim();
  if (!couponId) return;
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) return;

  await prisma.coupon.update({ where: { id: couponId }, data: { isActive: !coupon.isActive } });
  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "COUPON_TOGGLED",
    entity: "Coupon",
    entityId: couponId,
    summary: `${coupon.isActive ? "Disabled" : "Enabled"} coupon ${coupon.code}`,
    ipAddress: await clientIp()
  });
  revalidatePath("/admin/coupons");
}

export async function deleteCouponAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const couponId = String(formData.get("couponId") ?? "").trim();
  if (!couponId) return;
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) return;

  // Preserve history: a coupon that has been used is disabled, never deleted,
  // so its redemption records (and usage counts) stay intact. The page hides
  // the delete control for used coupons; this is the server-side guard.
  if (coupon.timesRedeemed > 0) {
    await prisma.coupon.update({ where: { id: couponId }, data: { isActive: false } });
    revalidatePath("/admin/coupons");
    return;
  }

  await prisma.coupon.delete({ where: { id: couponId } });
  await logAudit({
    actorId: admin.id,
    actorName: admin.name,
    action: "COUPON_DELETED",
    entity: "Coupon",
    entityId: couponId,
    summary: `Deleted coupon ${coupon.code}`,
    ipAddress: await clientIp()
  });
  revalidatePath("/admin/coupons");
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
    metadata: { channels: parsed.data.channels, emailsQueued: result.emailsQueued },
    ipAddress: await clientIp()
  });

  // Send queued emails promptly without blocking the response; cron backstops.
  if (result.emailsQueued > 0) after(() => drainOutbound().catch(() => {}));

  revalidatePath("/admin/notifications");
  return {
    status: "success",
    message: `Broadcast sent to ${result.recipients} members (emails queued: ${result.emailsQueued}, telegram: ${result.telegram}).`
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
  return { status: "success", message: "Content saved" };
}

/* --------------------------- Support ------------------------------ */

export async function resolveSupportTicketAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const ticketId = String(formData.get("ticketId") ?? "");
  const response = String(formData.get("response") ?? "").trim().slice(0, 2000) || null;
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
    // The member picks this up on their next notification poll — no in-process
    // push needed.
    await prisma.notification.create({
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
