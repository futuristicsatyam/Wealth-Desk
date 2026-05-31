import { z } from "zod";

/**
 * Runtime environment validation. Imported by `lib/auth.ts` so it always runs.
 * Optional integrations (Razorpay, SMTP, Twilio, Telegram) degrade gracefully
 * when unset, so they are validated as optional here.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 chars"),
  AUTH_SECRET_PREVIOUS: z.string().optional(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  PHONE_OTP_SECRET: z.string().optional(),
  APP_NAME: z.string().default("Wealth Research Desk"),
  SEBI_REGISTRATION: z.string().default("INH000000000"),
  GSTIN: z.string().default("27AAAAA0000A1Z5"),
  SUPPORT_EMAIL: z.string().default("support@wealthdesk.in")
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed. Check your .env file against .env.example.");
}

export const env = parsed.data;
export const APP_URL = env.APP_URL.replace(/\/$/, "");
