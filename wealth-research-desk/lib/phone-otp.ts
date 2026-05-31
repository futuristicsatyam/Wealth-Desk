import crypto from "crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

/** Normalizes Indian phone input to a bare 10-digit string. */
export function normalizePhoneNumber(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) {
    throw new Error("Enter a valid 10-digit Indian mobile number");
  }
  return digits;
}

export function generateOtpCode(): string {
  return crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

export function hashOtp(params: { phone: string; otp: string; secret: string }): string {
  return crypto
    .createHash("sha256")
    .update(`${params.phone}:${params.otp}:${params.secret}`)
    .digest("hex");
}

export function otpSecret(): string {
  const secret = process.env.PHONE_OTP_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("OTP secret missing");
  return secret;
}
