"use server";

import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { checkPhoneOtp } from "@/lib/otp-service";
import { createPasswordResetToken, consumePasswordReset } from "@/lib/password-reset";
import { consumeRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { sendEmail, emailLayout } from "@/lib/email";
import { escapeHtml } from "@/lib/html";
import { encryptPii, blindIndex } from "@/lib/pii";
import { APP_URL } from "@/lib/env";
import { registerSchema, loginSchema, resetPasswordSchema, firstError } from "@/lib/validations";

export type ActionState = { status: "idle" | "error" | "success"; message: string };

async function clientIp(): Promise<string> {
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "unknown"
  );
}

/** Signs in with credentials and redirects to the requested in-app path. */
export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) {
    return { status: "error", message: firstError(parsed.error) };
  }

  // Volumetric guard: throttle attempts from a single source. This is consumed
  // upfront but never locks out a specific account.
  const ip = await clientIp();
  const ipLimit = await consumeRateLimit(`login-ip:${ip}`, 30, 15 * 60 * 1000);
  if (!ipLimit.allowed) {
    return { status: "error", message: "Too many sign-in attempts. Please try again in a few minutes." };
  }

  // Only same-origin, non-protocol-relative paths are allowed as a redirect
  // target, so "next" cannot be turned into an open redirect (e.g. "//evil.com").
  const nextRaw = String(formData.get("next") ?? "/dashboard");
  const redirectTo = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo
    });
    return { status: "success", message: "Signed in" };
  } catch (error) {
    if (error instanceof AuthError) {
      // Penalise only FAILED attempts, per account. A correct password always
      // succeeds above and is never counted, so a legitimate user cannot be
      // locked out by an attacker spraying wrong passwords at their email.
      const fail = await consumeRateLimit(`login-fail:${parsed.data.email}`, 10, 15 * 60 * 1000);
      if (!fail.allowed) {
        return { status: "error", message: "Too many failed attempts for this account. Please try again later." };
      }
      return { status: "error", message: "Invalid email or password, or this account is suspended." };
    }
    throw error;
  }
}

/** Creates a new member account after OTP verification. */
export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    panNumber: formData.get("panNumber"),
    aadhaarNumber: formData.get("aadhaarNumber"),
    password: formData.get("password"),
    referralCode: formData.get("referralCode"),
    riskAccepted: formData.get("riskAccepted") === "on" || formData.get("riskAccepted") === "true"
  });
  if (!parsed.success) {
    return { status: "error", message: firstError(parsed.error) };
  }

  const otp = String(formData.get("otp") ?? "");
  if (!/^\d{6}$/.test(otp)) {
    return { status: "error", message: "Enter the 6-digit verification code" };
  }

  const ip = await clientIp();
  const limit = await consumeRateLimit(`register:${ip}`, 8, 60 * 60 * 1000);
  if (!limit.allowed) {
    return { status: "error", message: "Too many sign-up attempts. Please try again later." };
  }

  const data = parsed.data;

  const panHash = blindIndex(data.panNumber);
  const aadhaarHash = blindIndex(data.aadhaarNumber);

  // Dedup against email/phone (plaintext unique) and PAN/Aadhaar (blind index,
  // since the values themselves are encrypted). A single generic message avoids
  // leaking which identifier is already registered (account enumeration). This
  // runs BEFORE the OTP is consumed so a duplicate sign-up never burns the
  // user's verification code.
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: data.email },
        { phone: data.phone },
        { panHash },
        { aadhaarHash }
      ]
    },
    select: { id: true }
  });
  if (existing) {
    return { status: "error", message: "An account with these details already exists" };
  }

  // Verify and consume the OTP only once the account is known to be creatable.
  const otpCheck = await checkPhoneOtp(data.phone, otp, true);
  if (!otpCheck.ok) {
    return { status: "error", message: otpCheck.message };
  }

  // Resolve an optional referral code to the referring user. An unknown code is
  // ignored silently - it must never block a legitimate sign-up.
  let referredByUserId: string | undefined;
  if (data.referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: data.referralCode },
      select: { id: true }
    });
    if (referrer) referredByUserId = referrer.id;
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  try {
    const created = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        panNumber: encryptPii(data.panNumber),
        aadhaarNumber: encryptPii(data.aadhaarNumber),
        panHash,
        aadhaarHash,
        passwordHash,
        phoneVerifiedAt: new Date(),
        legalAcceptedAt: new Date(),
        role: "USER",
        referredByUserId
      }
    });

    await logAudit({
      actorId: created.id,
      actorName: created.name,
      action: "USER_REGISTERED",
      entity: "User",
      entityId: created.id,
      summary: `${created.name} created an account`,
      metadata: referredByUserId ? { referredByUserId } : undefined,
      ipAddress: ip
    });
  } catch (error) {
    // Lost the race against a concurrent sign-up with the same unique identifier.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", message: "An account with these details already exists" };
    }
    throw error;
  }

  return { status: "success", message: "Account created. You can now sign in." };
}

/** Sends a password-reset email. Never reveals whether the email exists. */
export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const genericMessage =
    "If an account exists for that email, a password-reset link has been sent.";

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { status: "error", message: "Enter a valid email address" };
  }

  const ip = await clientIp();
  const limit = await consumeRateLimit(`pwreset:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return { status: "error", message: "Too many requests. Please try again later." };
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (user) {
    const token = await createPasswordResetToken(user.id);
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    await logAudit({
      actorId: user.id,
      actorName: user.name,
      action: "PASSWORD_RESET_REQUESTED",
      entity: "User",
      entityId: user.id,
      summary: `Password reset requested for ${user.name}`,
      ipAddress: ip
    });
    await sendEmail({
      to: email,
      subject: "Reset your Wealth Research Desk password",
      html: emailLayout(
        "Password reset request",
        `<p>Hello ${escapeHtml(user.name)},</p>
         <p>We received a request to reset your password. This link is valid for 2 hours:</p>
         <p><a href="${resetUrl}" style="color:#8d7042">Reset my password</a></p>
         <p>If you did not request this, you can safely ignore this email.</p>`
      )
    });
  }

  return { status: "success", message: genericMessage };
}

/** Completes a password reset using a valid token. */
export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });
  if (!parsed.success) {
    return { status: "error", message: firstError(parsed.error) };
  }

  const ip = await clientIp();
  const limit = await consumeRateLimit(`pwreset-confirm:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return { status: "error", message: "Too many attempts. Please try again later." };
  }

  const result = await consumePasswordReset(parsed.data.token, parsed.data.password);
  if (!result) {
    return { status: "error", message: "This reset link is invalid or has expired." };
  }

  await logAudit({
    actorId: result.userId,
    actorName: result.userName,
    action: "PASSWORD_RESET_COMPLETED",
    entity: "User",
    entityId: result.userId,
    summary: `${result.userName} reset their password`,
    ipAddress: ip
  });

  return { status: "success", message: "Password updated. You can now sign in." };
}
