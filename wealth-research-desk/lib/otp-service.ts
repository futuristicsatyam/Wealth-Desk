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
import { sendSms } from "@/lib/sms";

type SendResult = { ok: boolean; message: string; devCode?: string };
type CheckResult = { ok: boolean; message: string };

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

  const sms = await sendSms({
    to: phone,
    body: `Your Wealth Research Desk verification code is ${code}. It expires in 10 minutes.`
  });

  // In development without Twilio, surface the code so registration can proceed.
  if (sms.skipped && process.env.NODE_ENV !== "production") {
    console.log(`[otp:dev] phone=${phone} code=${code}`);
    return { ok: true, message: "Verification code generated (dev mode)", devCode: code };
  }

  return { ok: true, message: "Verification code sent to your mobile number" };
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
