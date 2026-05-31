"use server";

import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { checkPhoneOtp } from "@/lib/otp-service";
import { createPasswordResetToken, consumePasswordReset } from "@/lib/password-reset";
import { consumeRateLimit } from "@/lib/rate-limit";
import { sendEmail, emailLayout } from "@/lib/email";
import { escapeHtml } from "@/lib/html";
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

  const nextRaw = String(formData.get("next") ?? "/dashboard");
  const redirectTo = nextRaw.startsWith("/") ? nextRaw : "/dashboard";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo
    });
    return { status: "success", message: "Signed in" };
  } catch (error) {
    if (error instanceof AuthError) {
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

  const otpCheck = await checkPhoneOtp(data.phone, otp, true);
  if (!otpCheck.ok) {
    return { status: "error", message: otpCheck.message };
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: data.email },
        { phone: data.phone },
        { panNumber: data.panNumber },
        { aadhaarNumber: data.aadhaarNumber }
      ]
    },
    select: { email: true, phone: true, panNumber: true, aadhaarNumber: true }
  });
  if (existing) {
    let field = "details";
    if (existing.email === data.email) field = "email";
    else if (existing.phone === data.phone) field = "mobile number";
    else if (existing.panNumber === data.panNumber) field = "PAN";
    else if (existing.aadhaarNumber === data.aadhaarNumber) field = "Aadhaar";
    return { status: "error", message: `An account with these ${field} already exists` };
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      panNumber: data.panNumber,
      aadhaarNumber: data.aadhaarNumber,
      passwordHash,
      phoneVerifiedAt: new Date(),
      legalAcceptedAt: new Date(),
      role: "USER"
    }
  });

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

  const ok = await consumePasswordReset(parsed.data.token, parsed.data.password);
  if (!ok) {
    return { status: "error", message: "This reset link is invalid or has expired." };
  }
  return { status: "success", message: "Password updated. You can now sign in." };
}
