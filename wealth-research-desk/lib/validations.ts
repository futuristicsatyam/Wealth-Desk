import { z } from "zod";

export const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const aadhaarRegex = /^[0-9]{12}$/;

// A small blocklist of the most common weak passwords (checked case-insensitively).
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890",
  "qwerty123", "11111111", "00000000", "abc123456", "iloveyou1", "welcome123"
]);

/**
 * Shared password rule for registration and reset: min 8 chars, must mix letters
 * and numbers, and must not be an obviously common password. (Login is not
 * subject to this — existing accounts keep working.)
 */
const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use at least one letter and one number")
  .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase()), "This password is too common - choose a stronger one");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.string().trim().email("Enter a valid email").toLowerCase(),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  panNumber: z.string().trim().toUpperCase().regex(panRegex, "Invalid PAN format"),
  aadhaarNumber: z.string().trim().regex(aadhaarRegex, "Aadhaar must be 12 digits"),
  password: passwordField,
  referralCode: z
    .string()
    .trim()
    .toUpperCase()
    .max(40)
    .optional()
    .transform((value) => (value ? value : undefined)),
  riskAccepted: z.literal(true, { errorMap: () => ({ message: "Risk disclosure must be accepted" }) })
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1)
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().toLowerCase()
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: passwordField,
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export const tradeInputSchema = z
  .object({
    // Attribution is optional - a trade may be published without an analyst.
    analystId: z
      .string()
      .trim()
      .transform((value) => value || undefined)
      .optional(),
    indexId: z.string().min(1, "Select an index"),
    instrument: z.string().trim().min(2).max(60),
    segment: z.string().trim().min(2).max(40),
    tradeType: z.enum(["BUY", "SELL"]),
    entryPrice: z.number().positive(),
    stopLoss: z.number().positive(),
    target1: z.number().positive(),
    target2: z.number().positive(),
    target3: z.number().positive().optional(),
    riskRating: z.number().int().min(1).max(5),
    rationale: z.string().trim().min(10).max(2000),
    chartImageUrl: z
      .string()
      .url()
      .refine((v) => /^https?:\/\//i.test(v), "Chart image URL must start with http:// or https://")
      .optional()
      .or(z.literal("")),
    isTrialVisible: z.boolean().default(false)
  })
  .refine((data) => data.target3 === undefined || data.target3 > 0, {
    message: "Target 3 must be positive",
    path: ["target3"]
  });

export const indexSchema = z.object({
  name: z.string().trim().min(2, "Index name is required").max(40),
  lotSize: z.number().int().min(1, "Lot size must be at least 1")
});

export const managedContentSchema = z.object({
  // Allows "legal:disclaimer", "lot-size-settings", etc. - lowercase words
  // separated by ":" or "-" only, so it can be used safely in revalidate paths.
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required")
    .max(80)
    .regex(/^[a-z0-9]+([:-][a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers, ':' and '-'"),
  title: z.string().trim().min(2, "Title is too short").max(160),
  body: z.string().trim().min(10, "Body must be at least 10 characters").max(20000)
});

export const tradeStatusSchema = z.object({
  tradeId: z.string().min(1),
  status: z.enum(["ACTIVE", "CLOSED", "TARGET1_HIT", "TARGET2_HIT", "TARGET3_HIT", "STOP_LOSS_HIT"]),
  updateMessage: z.string().trim().max(500).optional()
});

export const outlookSchema = z.object({
  // Attribution is optional - an outlook may be published without an analyst.
  analystId: z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .optional(),
  nifty: z.string().trim().min(4).max(400),
  bankNifty: z.string().trim().min(4).max(400),
  volatility: z.string().trim().min(4).max(400),
  globalCues: z.string().trim().min(4).max(800),
  sectorStrength: z.string().trim().min(4).max(800),
  institutionalSentiment: z.string().trim().min(4).max(800)
});

export const analystSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().toLowerCase(),
  experienceYears: z.number().int().min(0).max(60),
  specialization: z.string().trim().min(2).max(80),
  sebiRegistration: z.string().trim().min(4).max(40),
  bio: z.string().trim().min(10).max(600),
  isActive: z.boolean().default(true)
});

export const planSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]{2,24}$/, "Code: A-Z, 0-9, underscore"),
    name: z.string().trim().min(2).max(60),
    description: z.string().trim().max(300).optional(),
    planType: z.enum(["TRIAL", "MONTHLY", "QUARTERLY", "ANNUAL"]),
    amountRupees: z.number().int().min(0),
    durationDays: z.number().int().min(1).max(400),
    // Free days a referrer earns when someone buys this plan (0 = none).
    referralBonusDays: z.number().int().min(0).max(400).default(0),
    features: z.array(z.string().trim().min(1)).max(12),
    sortOrder: z.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
    // Special/private plan: hidden from public pricing, reachable only via link.
    isPrivate: z.boolean().default(false),
    // Optional cap on distinct members who may redeem the access link.
    maxRedemptions: z.number().int().min(1).max(100000).optional()
  })
  // A plan may be free (amount 0) only when it is a trial OR a private/special
  // plan (e.g. a complimentary invite). Public paid plans must cost > 0.
  .refine((data) => data.planType === "TRIAL" || data.isPrivate || data.amountRupees > 0, {
    message: "Public paid plans must have an amount greater than zero",
    path: ["amountRupees"]
  });

export const broadcastSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(1000),
  eventType: z.string().trim().min(2).max(40).default("MANUAL_BROADCAST"),
  audience: z.enum(["all", "active_subscribers"]).default("all"),
  channels: z.array(z.enum(["DASHBOARD", "EMAIL", "TELEGRAM"])).min(1, "Pick at least one channel")
});

export const supportTicketSchema = z.object({
  subject: z.string().trim().min(4).max(120),
  message: z.string().trim().min(10).max(2000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM")
});

export const trialActivateSchema = z.object({
  deviceFingerprint: z.string().min(8).max(400)
});

export const createOrderSchema = z.object({
  planCode: z.string().trim().min(1).toUpperCase(),
  // Required when purchasing a private/special plan; ignored for public plans.
  accessToken: z.string().trim().min(8).max(128).optional()
});

export const redeemPlanSchema = z.object({
  accessToken: z.string().trim().min(8).max(128)
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1)
});

export const phoneSendSchema = z.object({ phone: z.string().min(8) });
export const phoneVerifySchema = z.object({
  phone: z.string().min(8),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits")
});

/** Flattens a ZodError into a single human-readable message. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}
