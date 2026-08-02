# Research Wealth Desk

A paywalled equity-research platform for the Indian markets. SEBI-registered
analysts publish risk-defined F&O trade ideas and daily market outlooks; members
subscribe through Razorpay to unlock the full research feed, real-time trade
alerts, and a risk-first framework — **research & education only, no fund
handling, no guaranteed returns.**

- **Live:** https://www.researchwealthdesk.com
- **Version:** 2.0 — a ground-up rewrite that closed every issue from the
  original code review (paywall bypasses, replayable payments, missing route
  protection, trial abuse, coupon TOCTOU, and more).

## Features

**Members** (`/dashboard`)
- Daily F&O setups with defined entry / stop-loss / targets and a 1–5 risk rating
- Live market outlook, trade history with published outcomes
- Real-time in-app notifications (polling) + optional Telegram DM alerts
- Subscriptions, billing history, referral programme, coupon redemption
- One-time free trial (device- + IP-abuse guarded)
- Submit text **reviews** and **video reels** (YouTube/Instagram) for the home page
- Account settings + self-service password change

**Admin** (`/admin`)
- Publish/manage trades, outlooks, analysts, plans, coupons
- Verify & publish member reviews and video testimonials
- Subscriptions, payments, trials, support tickets, audit log, analytics
- Broadcast notifications (dashboard / email / Telegram)
- Managed legal/marketing content

**Platform**
- Razorpay checkout with server-verified signatures + webhook-driven activation
- Transactional email via Resend (verification OTP, password reset)
- AES-256-GCM encryption at rest for PII (PAN/Aadhaar) with key rotation
- Strict nonce-based CSP, fail-closed secrets, constant-time comparisons

## Stack

- **Next.js 15** (App Router, React 19, Server Actions, `after()`)
- **TypeScript** (strict)
- **Prisma 6** + **PostgreSQL** (Neon)
- **NextAuth v5** (credentials, JWT sessions, `sessionVersion` revocation)
- **Razorpay** (orders, checkout, webhooks)
- **Resend** (transactional email; SMTP fallback)
- **Tailwind CSS 3** with semantic design tokens + light/dark themes
- **Framer Motion**, **Three.js** (hero visual), **Recharts** (admin analytics)

## Prerequisites

- Node.js 20 or newer
- A PostgreSQL database (local, or hosted — Neon/Supabase)
- A Razorpay account (test mode is fine for development)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    then fill in at least DATABASE_URL and AUTH_SECRET

# 3. Create the database schema
npm run prisma:push

# 4. Seed demo data (users, analysts, plans, trades, outlooks)
npm run prisma:seed

# 5. Start the dev server
npm run dev
```

The app runs at `http://localhost:3000`. The admin console is at `/admin`; the
member dashboard is at `/dashboard`.

> **Note:** the app uses `prisma db push` (no migration history). After any
> schema change, **restart the dev server** so it picks up the regenerated
> Prisma client. If you see CSS 404s or a `clientReferenceManifest` error, the
> `.next` cache is stale — `rm -rf .next` and restart.

## Environment variables

Validated at startup in `lib/env.ts`. Only `DATABASE_URL` and `AUTH_SECRET` are
strictly required; everything else degrades gracefully or has a default.

### Core

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (pooled) |
| `DIRECT_URL` | No | Direct connection (for `prisma migrate`) |
| `AUTH_SECRET` | **Yes** | NextAuth signing secret (`openssl rand -base64 32`, ≥32 chars) |
| `AUTH_SECRET_PREVIOUS` | No | Previous secret, set during a rotation |
| `APP_URL` | Prod | Public base URL — used in emails, reset links, SEO/canonical |
| `APP_NAME` | No | Brand name (default `Research Wealth Desk`) |
| `PII_ENCRYPTION_KEY` | Prod | AES-256-GCM key for PAN/Aadhaar at rest |
| `PII_ENCRYPTION_KEY_PREVIOUS` | No | Previous PII key, set during a rotation |
| `SUPPORT_EMAIL` | No | Address shown on the Contact page |
| `SEBI_REGISTRATION` | Prod | Real SEBI RA registration number (shown to users) |
| `GSTIN` | Prod | Real GSTIN (invoices/legal) |

### Payments — Razorpay

| Variable | Required | Purpose |
| --- | --- | --- |
| `RAZORPAY_KEY_ID` | For payments | Key ID (`rzp_test_…` / `rzp_live_…`) |
| `RAZORPAY_KEY_SECRET` | For payments | Order creation + checkout signature verify |
| `RAZORPAY_WEBHOOK_SECRET` | For payments | Verifies incoming webhooks |

> Online payments are disabled gracefully if Razorpay keys are absent — the rest
> of the app still runs.

### Email

| Variable | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | For email | Resend API key (preferred sender) |
| `RESEND_FROM` | For email | From address on a **verified** Resend domain |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | No | SMTP fallback if Resend is unset |

> In production, email delivery **fails loudly** — registration requires a
> deliverable OTP, so a verified sending domain is mandatory to onboard users.

### Notifications & background jobs

| Variable | Required | Purpose |
| --- | --- | --- |
| `CRON_SECRET` | Prod | Auth for the outbox cron (`Authorization: Bearer …`) |
| `TELEGRAM_BOT_TOKEN` | No | Telegram DM alerts + channel broadcasts |
| `TELEGRAM_BOT_USERNAME` | No | Deep-link for account linking |
| `TELEGRAM_CHANNEL_ID` | No | Channel broadcast target |
| `TELEGRAM_WEBHOOK_SECRET` | No | Verifies Telegram webhook calls |

### Phone OTP (optional — disabled by default)

Mobile verification at checkout is gated behind a flag and turned **off**,
because A2P SMS to India needs DLT registration.

| Variable | Purpose |
| --- | --- |
| `PHONE_VERIFICATION_ENABLED` | Set to `"true"` to require verified mobile at paid checkout |
| `PHONE_OTP_SECRET` | Salt for hashed phone OTPs |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | SMS provider (falls back to console log in dev) |

## Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Generate the Prisma client and build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint with ESLint |
| `npm run typecheck` | Type-check without emitting |
| `npm run prisma:push` | Sync the schema to the database |
| `npm run prisma:migrate` | Create and apply a migration |
| `npm run prisma:seed` | Seed demo data |

## Razorpay webhook

The webhook endpoint is the **single authority** for activating subscriptions.
Configure it in the Razorpay dashboard (in **Live** mode for production):

```
{APP_URL}/api/webhooks/razorpay
```

Subscribe to `payment.captured`, `order.paid`, and `payment.failed`, and set the
webhook secret to match `RAZORPAY_WEBHOOK_SECRET`.

> **Live keys** require Razorpay to **approve your website** first (24–48h) — test
> keys work immediately for validating the full checkout → activation flow.

## Notifications & cron

Immediate notifications are written inline when trades are published; external
channels (Telegram/email) are queued to an **outbox** and drained by a cron:

```
{APP_URL}/api/cron/dispatch     # GET, requires Authorization: Bearer $CRON_SECRET
```

Scheduled in `vercel.json`. On the Vercel **Hobby** plan, crons may run **at most
once per day** (`0 0 * * *`) — an every-minute schedule is rejected and will
block deployments. For minute-level dispatch, use an external cron service.

## Deployment (Vercel)

- Build command is `prisma generate && next build` — it does **not** apply schema
  changes. Run `prisma db push` against the production `DATABASE_URL` yourself
  when the schema changes (or switch to `prisma migrate deploy`).
- Env-var changes require a **redeploy** to take effect.
- Custom domains: point the apex `A` record to Vercel and `www` via `CNAME`, or
  use Vercel nameservers. Set `APP_URL` to the canonical domain.
- See `docs/DEPLOYMENT.md` for the full production checklist.

## Security highlights

- Nonce + `strict-dynamic` CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`
- Server-verified Razorpay signatures (checkout + webhook), constant-time compare
- Webhook/cron routes **fail closed** in production when their secret is unset
- CSRF via same-origin `Origin` check; `x-real-ip`-preferred client IP
- PII encrypted at rest (AES-256-GCM) with key rotation; JWT revocation via
  `sessionVersion`; user-enumeration and timing protections on auth/OTP

## Documentation

- `docs/ARCHITECTURE.md` — structure, design decisions, review fixes
- `docs/API_MAP.md` — every route and what it does
- `docs/DEPLOYMENT.md` — production deployment checklist

## Compliance note

This software is a research-distribution platform. It does not execute trades,
hold client funds, or provide portfolio management. All published research is
educational and risk-bearing; testimonials are framed as service feedback only
(no returns/performance claims). See `/legal/disclaimer` in the running app.
