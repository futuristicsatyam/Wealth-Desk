# Wealth Research Desk

A paywalled equity-research platform for the Indian markets. SEBI-registered
analysts publish risk-defined trade ideas and daily market outlooks; members
subscribe through Razorpay to unlock the full research feed.

This is **version 2.0** — a ground-up rewrite that resolves every issue raised
in the original code review (paywall bypasses, replayable payments, missing
route protection, trial abuse, and more). See `docs/ARCHITECTURE.md` for the
full list of fixes.

## Stack

- **Next.js 15** (App Router, React 19, Server Actions)
- **TypeScript** (strict)
- **Prisma 6** + **PostgreSQL**
- **NextAuth v5** (credentials, JWT sessions)
- **Razorpay** (orders, checkout, webhooks)
- **Tailwind CSS 3** with semantic design tokens + dark mode

## Prerequisites

- Node.js 20 or newer
- A PostgreSQL database (local, or a hosted provider such as Neon/Supabase)
- A Razorpay account (test mode is fine for development)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    then fill in DATABASE_URL, AUTH_SECRET, and the Razorpay keys

# 3. Create the database schema
npm run prisma:push

# 4. Seed demo data (users, analysts, plans, trades, outlooks)
npm run prisma:seed

# 5. Start the dev server
npm run dev
```

The app runs at `http://localhost:3000`.

## Demo credentials

| Role   | Email                   | Password       |
| ------ | ----------------------- | -------------- |
| Admin  | `admin@wealthdesk.in`   | `Admin@12345`  |
| Member | `member@wealthdesk.in`  | `Member@12345` |

The admin console is at `/admin`; the member dashboard is at `/dashboard`.

## Environment variables

| Variable                              | Required | Purpose                                              |
| -------------------------------------- | -------- | ---------------------------------------------------- |
| `DATABASE_URL`                         | Yes      | PostgreSQL connection string (pooled)                |
| `DIRECT_URL`                           | Yes      | Direct connection for migrations                    |
| `AUTH_SECRET`                          | Yes      | NextAuth signing secret (`openssl rand -base64 32`)  |
| `AUTH_SECRET_PREVIOUS`                 | No       | Previous secret, set during a secret rotation        |
| `APP_URL`                              | Yes      | Public base URL, used in emails and reset links      |
| `RAZORPAY_KEY_ID` / `_KEY_SECRET`      | Yes\*    | Razorpay API credentials                             |
| `RAZORPAY_WEBHOOK_SECRET`              | Yes\*    | Verifies incoming Razorpay webhooks                  |
| `PHONE_OTP_SECRET`                     | No       | Salt for hashed phone OTPs                           |
| `TWILIO_*`                             | No       | SMS delivery; falls back to console logging in dev   |
| `TELEGRAM_BOT_TOKEN` / `_CHANNEL_ID`   | No       | Broadcasts to a Telegram channel                     |
| `SMTP_*`                               | No       | Transactional email; falls back to console in dev    |

\* Online payments are disabled gracefully if Razorpay keys are absent — the
rest of the app still runs.

## Available scripts

| Script                  | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Start the development server                 |
| `npm run build`         | Generate the Prisma client and build         |
| `npm run start`         | Run the production build                     |
| `npm run lint`          | Lint with ESLint                             |
| `npm run typecheck`     | Type-check without emitting                  |
| `npm run prisma:push`   | Sync the schema to the database              |
| `npm run prisma:migrate`| Create and apply a migration                 |
| `npm run prisma:seed`   | Seed demo data                               |

## Razorpay webhook

The webhook endpoint is the **single authority** for activating subscriptions.
Configure it in the Razorpay dashboard:

```
{APP_URL}/api/webhooks/razorpay
```

Subscribe to the `payment.captured`, `order.paid`, and `payment.failed`
events, and set the webhook secret to match `RAZORPAY_WEBHOOK_SECRET`.

## Documentation

- `docs/ARCHITECTURE.md` — structure, design decisions, and review fixes
- `docs/API_MAP.md` — every route and what it does
- `docs/DEPLOYMENT.md` — production deployment checklist

## Compliance note

This software is a research-distribution platform. It does not execute trades,
hold client funds, or provide portfolio management. All published research is
educational and risk-bearing; see `/legal/disclaimer` in the running app.
