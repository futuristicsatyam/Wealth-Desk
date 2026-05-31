# API & Route Map

## Pages

### Public — `app/(marketing)/`

| Route             | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `/`               | Homepage — live stats, working CTAs                  |
| `/about`          | Company and analyst team                             |
| `/faq`            | Frequently asked questions                           |
| `/contact`        | Contact details and support routing                 |
| `/membership`     | Public pricing table                                 |
| `/performance`    | Aggregate closed-trade outcomes (no priced detail)   |
| `/legal/[slug]`   | Disclaimer, privacy, terms, refund (DB-overridable)  |

### Auth — `app/(auth)/`

| Route               | Description                              |
| ------------------- | ---------------------------------------- |
| `/login`            | Sign in                                  |
| `/register`         | Two-step registration with phone OTP     |
| `/forgot-password`  | Request a password-reset link            |
| `/reset-password`   | Set a new password from a token          |

### Member — `app/dashboard/` (requires an authenticated, non-banned user)

| Route                      | Description                            |
| -------------------------- | -------------------------------------- |
| `/dashboard`               | Overview                               |
| `/dashboard/trades`        | Active trades (entitlement-gated)      |
| `/dashboard/outlook`       | Daily market outlook                   |
| `/dashboard/history`       | Closed-trade history                   |
| `/dashboard/notifications` | Notifications, mark-all-read           |
| `/dashboard/subscription`  | Plans, status, subscription history    |
| `/dashboard/billing`       | Razorpay checkout + invoice history    |
| `/dashboard/support`       | Raise and track support tickets        |

### Admin — `app/admin/` (requires the ADMIN role)

| Route                   | Description                               |
| ----------------------- | ----------------------------------------- |
| `/admin`                | Operations KPIs                           |
| `/admin/trades`         | Publish trades, update trade status       |
| `/admin/outlooks`       | Publish daily outlooks                    |
| `/admin/analysts`       | Analyst CRUD and activation               |
| `/admin/users`          | Role and ban management                   |
| `/admin/plans`          | Plan configuration                        |
| `/admin/subscriptions`  | Customer subscriptions + CSV export       |
| `/admin/payments`       | Payment log + CSV export                  |
| `/admin/trials`         | Trial activations with abuse signals      |
| `/admin/notifications`  | Broadcast composer + history              |
| `/admin/content`        | Legal/compliance content editor           |
| `/admin/audit`          | Immutable audit log                       |
| `/admin/support`        | Support ticket management                 |

## API route handlers — `app/api/`

| Method & Route                         | Auth          | Description                                  |
| --------------------------------------- | ------------- | -------------------------------------------- |
| `GET/POST /api/auth/[...nextauth]`      | —             | NextAuth handler                             |
| `POST /api/auth/phone-otp/send`         | Origin + rate | Send a phone-verification OTP                |
| `POST /api/auth/phone-otp/verify`       | Origin + rate | Check an OTP (non-consuming)                 |
| `GET  /api/trades`                      | User + plan   | Member trade feed (entitlement-gated)        |
| `GET  /api/outlooks`                    | User + plan   | Member outlook feed (entitlement-gated)      |
| `GET  /api/subscriptions/plans`         | —             | Public list of active plans                  |
| `POST /api/subscriptions/create-order`  | User          | Create a Razorpay order                      |
| `POST /api/subscriptions/verify`        | User          | Confirm checkout (idempotent grant)          |
| `POST /api/trial/activate`              | User          | Activate the one-time trial                  |
| `POST /api/webhooks/razorpay`           | Signature     | Razorpay webhook — authoritative grant path  |
| `GET  /admin/revenue/export`            | Admin         | CSV export of payments                       |

## Server Actions

| File                      | Actions                                                       |
| ------------------------- | ------------------------------------------------------------- |
| `app/(auth)/actions.ts`   | `registerAction`, `requestPasswordResetAction`, `resetPasswordAction` |
| `app/dashboard/actions.ts`| `createSupportTicketAction`, `markAllNotificationsReadAction` |
| `app/admin/actions.ts`    | Trade, outlook, analyst, user, plan, broadcast, content, and ticket actions — all audit-logged |
