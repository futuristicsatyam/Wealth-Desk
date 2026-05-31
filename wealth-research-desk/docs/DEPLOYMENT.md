# Deployment

This guide targets **Vercel + a managed PostgreSQL provider** (Neon, Supabase,
or similar), which is the simplest production setup for a Next.js 15 app.

## 1. Provision the database

Create a PostgreSQL database and note two connection strings:

- A **pooled** connection → `DATABASE_URL`
- A **direct** connection → `DIRECT_URL` (used for migrations)

## 2. Apply the schema

From a machine with the direct URL configured:

```bash
npm install
npm run prisma:migrate    # or: npm run prisma:push for a non-migration sync
npm run prisma:seed       # optional: load demo data
```

## 3. Configure environment variables

Set these in the Vercel project settings (or your host's equivalent):

```
DATABASE_URL              pooled PostgreSQL URL
DIRECT_URL                direct PostgreSQL URL
AUTH_SECRET               openssl rand -base64 32
APP_URL                   https://your-domain.com
RAZORPAY_KEY_ID           live or test key id
RAZORPAY_KEY_SECRET       matching secret
RAZORPAY_WEBHOOK_SECRET   webhook signing secret
```

Optional integrations (the app degrades gracefully if these are unset):

```
PHONE_OTP_SECRET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
APP_NAME, SEBI_REGISTRATION, GSTIN, SUPPORT_EMAIL
```

`AUTH_SECRET_PREVIOUS` is only needed temporarily when rotating `AUTH_SECRET`
— set it to the old value so existing sessions survive the rotation.

## 4. Build settings

The default build command is `npm run build`, which runs `prisma generate`
followed by `next build`. No extra configuration is required.

## 5. Configure the Razorpay webhook

In the Razorpay dashboard, add a webhook:

- **URL:** `https://your-domain.com/api/webhooks/razorpay`
- **Secret:** the same value as `RAZORPAY_WEBHOOK_SECRET`
- **Events:** `payment.captured`, `order.paid`, `payment.failed`

The webhook is the authoritative path for activating subscriptions. The
browser-side `verify` call is a faster-feedback fallback and is idempotent
with the webhook — neither can double-grant.

## 6. Post-deploy checklist

- [ ] Sign in with the seeded admin account and change its password
- [ ] Confirm `/dashboard` and `/admin` redirect anonymous visitors to login
- [ ] Run a Razorpay **test-mode** payment end to end
- [ ] Confirm the webhook shows a `200` in the Razorpay dashboard logs
- [ ] Verify a captured payment creates an active subscription
- [ ] Check `/admin/audit` records the test actions
- [ ] Review `/legal/disclaimer` and the other legal pages for accuracy

## Operational notes

- **Rate-limit table.** `RateLimit` rows accumulate; a periodic job deleting
  rows where `expiresAt < now()` keeps the table small. The limiter still
  functions correctly without it.
- **Phone OTP / password-reset rows.** `PhoneOtp` and `PasswordResetToken`
  rows are short-lived; expired rows can be pruned on the same schedule.
- **Secret rotation.** To rotate `AUTH_SECRET`: move the current value to
  `AUTH_SECRET_PREVIOUS`, set a new `AUTH_SECRET`, deploy, then clear
  `AUTH_SECRET_PREVIOUS` after existing sessions have expired.
