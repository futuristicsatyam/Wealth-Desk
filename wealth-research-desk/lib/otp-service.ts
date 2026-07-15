import { prisma } from "@/lib/prisma";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  generateOtpCode,
  hashOtp,
  normalizePhoneNumber,
  otpSecret
} from "@/lib/phone-otp";
import { sendOtpSms } from "@/lib/sms";
import { sendEmail, emailLayout } from "@/lib/email";
import { escapeHtml } from "@/lib/html";

type SendResult = { ok: boolean; message: string; devCode?: string };
type CheckResult = { ok: boolean; message: string };

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Generates and dispatches an OTP for the given phone number. */
export async function sendPhoneOtp(rawPhone: string): Promise<SendResult> {
  let phone: string;
  try {
    phone = normalizePhoneNumber(rawPhone);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Invalid phone number" };
  }

  const existing = await prisma.phoneOtp.findUnique({ where: { phone } });
  if (existing && existing.resendAvailableAt.getTime() > Date.now()) {
    const wait = Math.ceil((existing.resendAvailableAt.getTime() - Date.now()) / 1000);
    return { ok: false, message: `Please wait ${wait}s before requesting another code` };
  }

  const code = generateOtpCode();
  const otpHash = hashOtp({ phone, otp: code, secret: otpSecret() });
  const now = Date.now();

  await prisma.phoneOtp.upsert({
    where: { phone },
    create: {
      phone,
      otpHash,
      expiresAt: new Date(now + OTP_TTL_MS),
      resendAvailableAt: new Date(now + OTP_RESEND_COOLDOWN_MS),
      attempts: 0
    },
    update: {
      otpHash,
      expiresAt: new Date(now + OTP_TTL_MS),
      resendAvailableAt: new Date(now + OTP_RESEND_COOLDOWN_MS),
      attempts: 0,
      verifiedAt: null
    }
  });

  const sms = await sendOtpSms({ to: phone, code });

  if (!sms.sent) {
    // Dev without an SMS provider: surface the code so registration can proceed.
    if (sms.skipped && process.env.NODE_ENV !== "production") {
      console.log(`[otp:dev] phone=${phone} code=${code}`);
      return { ok: true, message: "Verification code generated (dev mode)", devCode: code };
    }
    // Real delivery failure (provider unconfigured in prod, or an API error).
    // Fail loudly instead of falsely telling the user a code was sent.
    console.error(`[otp] SMS delivery failed for ${phone}: ${sms.error ?? "unknown error"}`);
    return { ok: false, message: "Could not send the verification code. Please try again shortly." };
  }

  return { ok: true, message: "Verification code sent to your mobile number" };
}

/** Generates and emails an OTP for verifying an email address (via Resend). */
export async function sendEmailOtp(rawEmail: string): Promise<SendResult> {
  const email = normalizeEmail(rawEmail);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address" };
  }

  const existing = await prisma.emailOtp.findUnique({ where: { email } });
  if (existing && existing.resendAvailableAt.getTime() > Date.now()) {
    const wait = Math.ceil((existing.resendAvailableAt.getTime() - Date.now()) / 1000);
    return { ok: false, message: `Please wait ${wait}s before requesting another code` };
  }

  const code = generateOtpCode();
  // hashOtp keys on an arbitrary label; we pass the email in the phone slot.
  const otpHash = hashOtp({ phone: email, otp: code, secret: otpSecret() });
  const now = Date.now();

  await prisma.emailOtp.upsert({
    where: { email },
    create: {
      email,
      otpHash,
      expiresAt: new Date(now + OTP_TTL_MS),
      resendAvailableAt: new Date(now + OTP_RESEND_COOLDOWN_MS),
      attempts: 0
    },
    update: {
      otpHash,
      expiresAt: new Date(now + OTP_TTL_MS),
      resendAvailableAt: new Date(now + OTP_RESEND_COOLDOWN_MS),
      attempts: 0,
      verifiedAt: null
    }
  });

  const mail = await sendEmail({
    to: email,
    subject: "Your Wealth Research Desk verification code",
    html: emailLayout(
      "Verify your email",
      `<p>Your verification code is:</p>
       <p style="font-size:24px;font-weight:bold;letter-spacing:4px">${escapeHtml(code)}</p>
       <p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`
    )
  });

  // In development without an email provider, surface the code so registration
  // can proceed. In production a non-send fails loudly.
  if (!mail.sent) {
    if (mail.skipped && process.env.NODE_ENV !== "production") {
      console.log(`[email-otp:dev] email=${email} code=${code}`);
      return { ok: true, message: "Verification code generated (dev mode)", devCode: code };
    }
    console.error(`[email-otp] delivery failed for ${email}: ${mail.error ?? "unknown error"}`);
    return { ok: false, message: "Could not send the verification code. Please try again shortly." };
  }

  return { ok: true, message: "Verification code sent to your email" };
}

/** Validates an email OTP. When `consume` is true the record is removed on success. */
export async function checkEmailOtp(
  rawEmail: string,
  otp: string,
  consume: boolean
): Promise<CheckResult> {
  const email = normalizeEmail(rawEmail);

  const record = await prisma.emailOtp.findUnique({ where: { email } });
  if (!record) return { ok: false, message: "Request a verification code first" };
  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, message: "Verification code has expired" };
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, message: "Too many incorrect attempts - request a new code" };
  }

  const expectedHash = hashOtp({ phone: email, otp, secret: otpSecret() });
  if (expectedHash !== record.otpHash) {
    await prisma.emailOtp.update({ where: { email }, data: { attempts: { increment: 1 } } });
    return { ok: false, message: "Incorrect verification code" };
  }

  if (consume) {
    await prisma.emailOtp.delete({ where: { email } });
  } else {
    await prisma.emailOtp.update({ where: { email }, data: { verifiedAt: new Date() } });
  }
  return { ok: true, message: "Email verified" };
}

/** Validates an OTP. When `consume` is true the record is removed on success. */
export async function checkPhoneOtp(
  rawPhone: string,
  otp: string,
  consume: boolean
): Promise<CheckResult> {
  let phone: string;
  try {
    phone = normalizePhoneNumber(rawPhone);
  } catch {
    return { ok: false, message: "Invalid phone number" };
  }

  const record = await prisma.phoneOtp.findUnique({ where: { phone } });
  if (!record) return { ok: false, message: "Request a verification code first" };
  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, message: "Verification code has expired" };
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, message: "Too many incorrect attempts - request a new code" };
  }

  const expectedHash = hashOtp({ phone, otp, secret: otpSecret() });
  if (expectedHash !== record.otpHash) {
    await prisma.phoneOtp.update({
      where: { phone },
      data: { attempts: { increment: 1 } }
    });
    return { ok: false, message: "Incorrect verification code" };
  }

  if (consume) {
    await prisma.phoneOtp.delete({ where: { phone } });
  } else {
    await prisma.phoneOtp.update({ where: { phone }, data: { verifiedAt: new Date() } });
  }
  return { ok: true, message: "Mobile number verified" };
}
