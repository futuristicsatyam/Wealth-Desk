# Architecture

## Overview

Wealth Research Desk is a single Next.js 15 application using the App Router.
It serves three audiences from one codebase:

- **Public visitors** — marketing pages, pricing, aggregate performance
- **Members** — the research dashboard behind a subscription paywall
- **Administrators** — an operations console for content and customers

## Directory layout

```
app/
  (marketing)/      Public pages: home, about, faq, contact, membership,
                    performance, legal/[slug]
  (auth)/           Sign in, register, forgot/reset password + auth actions
  dashboard/        Member area (layout enforces auth)
  admin/            Admin console (layout enforces ADMIN role)
  api/              Route handlers for client-JS calls + the Razorpay webhook
components/
  ui/               Primitive components (button, card, input, ...)
  auth/             Auth form components
  dashboard/        Member dashboard components
  admin/            Admin form components
lib/                Server-side domain logic (one file per concern)
prisma/             Schema + seed
docs/               This documentation
```

## Key design decisions

### Mutations: Server Actions, not API routes

Form submissions (register, support tickets, all admin operations) use
**Server Actions**. API route handlers exist only where a non-form client
needs them: phone OTP, Razorpay order/verify, the trade/outlook JSON feeds,
trial activation, and the Razorpay webhook.

### Authorisation is re-checked on every request

`lib/session.ts` exposes `requireUser`, `requireAdmin`, `requireStaff`, and
`getApiUser`. Each one reloads the user from the database and rejects banned
accounts — a stale JWT cannot keep a suspended user in. Route-group layouts
(`dashboard/layout.tsx`, `admin/layout.tsx`) call these, so every nested page
is protected without per-page boilerplate. `middleware.ts` adds a cheap
cookie-presence redirect and security headers, but is not the security
boundary itself.

### Payments: the webhook is the single grant authority

`grantSubscriptionFromPayment` runs inside a transaction and is **idempotent**
— it is safe to call twice. Both the browser `verify` endpoint and the
Razorpay webhook call it; whichever runs second is a no-op. Subscriptions are
keyed by a unique `razorpayOrderId`, so a double grant is impossible.

### Rate limiting is database-backed

`lib/rate-limit.ts` stores counters in a `RateLimit` table, so limits hold
across serverless invocations (an in-memory limiter would not).

### Theming uses semantic tokens

Tailwind is configured with semantic colours (`background`, `surface`,
`card`, `border`, `foreground`, `muted`, `accent`, `positive`, `negative`,
`warning`). Dark mode flips the token values; components never hard-code
colours, so there are no `!important` overrides.

## Review fixes delivered in v2.0

### Critical

- **C1 — Paywall bypass.** `/api/trades` and `/api/outlooks` GET handlers now
  require an authenticated user with an active entitlement. The public
  performance page shows only aggregate outcomes, never entry/target prices.
- **C2 — Replayable payment verification.** Verification is idempotent and the
  payment row must belong to the requesting user.
- **C3 — Verify/webhook race.** A single idempotent grant function removes the
  race; documentation now states the correct webhook path.
- **C4 — Banned users not locked out.** Every session helper re-checks
  `isBanned` against the database.
- **C5 — Middleware did not protect routes.** Authorisation lives in the
  route-group layouts and session helpers, not in middleware alone.
- **C6 — Trivial trial abuse.** Trial eligibility requires completed KYC, is
  one-time per user (`TrialUsage.userId` is unique), is blocked after any paid
  plan, and records a hashed IP and device fingerprint for review.
- **C7 — In-memory rate limiter.** Replaced with a database-backed limiter.
- **C8 — Injection / missing validation.** All user input is validated with
  Zod; all values interpolated into email or Telegram HTML are escaped.

### High

- **H1 — Fake data shown as real.** Every figure is a live database aggregate.
- **H2 — Dead homepage CTAs.** All calls to action route to real pages.
- **H3 — Non-functional support form.** Support tickets persist and appear in
  both the member and admin consoles.
- **H4 — Stub analyst management.** Full analyst CRUD with activation toggles.
- **H5 — No mobile navigation.** Public and dashboard shells have a working
  mobile menu.
- **H6 — Wrong trade attribution.** Trades are attributed to a selected
  analyst record.
- **H7 — Weak admin validation.** All admin actions validate with Zod.
- **H8 — No audit logging.** Every privileged action writes an `AuditLog`
  entry, viewable at `/admin/audit`.
- **H9 — Admin self-lockout.** An admin cannot change or suspend their own
  account, and the last remaining admin cannot be demoted or banned.
- **H10 — `razorpaySubId` misuse.** Subscriptions key off a unique
  `razorpayOrderId`.
- **H11 — Dead `lib/env.ts`.** Environment variables are validated at startup
  with Zod and consumed across the app.
