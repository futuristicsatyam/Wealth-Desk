# End-to-End Test & Security Audit — Wealth Research Desk

**Date:** 2026-07-05
**Stack:** Next.js 15.5.18 (App Router) · React 19 · Prisma 6 · PostgreSQL (Neon) · NextAuth v5 · Razorpay
**Scope:** Static code/config audit + automated tooling (build, `npm audit`, secret/git scan) + parallel code review across security, functional, SEO, a11y and content domains.

> **Method note / honest limitation.** This audit was run in an environment where **the live dev server and browser automation are not available**. That means the following were **NOT executed** and must be run on a real machine (scripts provided in §11):
> - Cross-browser & responsive testing (Playwright)
> - Lighthouse / Core Web Vitals
> - Live/dynamic XSS & injection probing against a running server
> - Load testing (k6/autocannon)
> - Live header/cookie inspection, analytics firing
>
> Everything else below is from **actual tool runs and line-by-line code review**, with file:line citations. Where a control could only be *confirmed* at runtime, it is listed under "Needs runtime verification."

---

## 1. Executive Summary

**Overall health: GOOD.** The application is unusually well-hardened for its scope. Authentication is DB-backed (not JWT-trusting), authorization is enforced at both middleware and page/action layers, every IDOR-prone query is correctly scoped to the current user, CSRF/clickjacking/transport protections are present, PII is encrypted at rest, and there is no raw SQL or unsafe HTML rendering. No Critical or High **application-code** vulnerabilities were found.

The most material issues are: (1) a **broken production build** — *found and fixed during this audit*; (2) **dependency vulnerabilities** (2 high, via `npm audit`); (3) a **cookie-consent / DPDP-Act compliance gap**; and (4) a handful of hardening and polish items.

### Pass/Fail by category

| Category | Result | Notes |
|---|---|---|
| 1. Setup & Environment | ⚠️ Fixed | Build was **broken** (ESLint errors) — fixed; secrets clean; deps have vulns |
| 2. Functional (code review) | ⚠️ Pass w/ issues | 1 render-time bug, several UX no-op gaps; no dead links |
| 3. Cross-browser & Responsive | ⏳ Not run | Requires Playwright on a live server |
| 4. Performance | ⏳ Not run | Requires Lighthouse/k6 on a live server |
| 5. Security | ✅ Strong | No IDOR / priv-esc / injection; 1 Medium (session revocation) + Lows |
| 6. Accessibility | ✅ Good (static) | Labels/landmarks/aria solid; contrast needs runtime check |
| 7. SEO & Metadata | ⚠️ Pass w/ gaps | Solid base; missing OG image, favicon, canonicals |
| 8. Content & Legal | ⚠️ Action needed | **No cookie consent**; brand inconsistency; dummy fallbacks |
| 9. Analytics | ➖ N/A | No analytics integration found in code |

### Findings count

| Severity | Count |
|---|---|
| Critical | 1 (**fixed** during audit) |
| High | 3 |
| Medium | 6 |
| Low | 14 |
| Info / Verified-OK | 20+ |

---

## 2. Security Findings (priority) — OWASP-mapped

> No SQL/NoSQL injection, no IDOR, no broken access control, no privilege escalation, and no sensitive-data over-fetch were found. Prisma is used with parameterized queries throughout; the sole `$queryRaw` is a `SELECT 1` health check with no interpolation.

| ID | Severity | OWASP | Issue | Location | Fix |
|---|---|---|---|---|---|
| SEC-1 | Medium | A05 Misconfig | CSP `style-src` allows `'unsafe-inline'` in production | `middleware.ts:52` | Move to nonce/hash styles or document as Tailwind tradeoff |
| SEC-2 | Medium | A05 Misconfig | `img-src` allows any HTTPS host (`https:`) | `middleware.ts:50` | Restrict to hosts actually used (`'self' data:` + known CDNs) |
| SEC-3 | Medium | A07 Auth | Password reset does **not** revoke existing sessions (14-day JWTs stay valid) | `lib/password-reset.ts:38-48`, `lib/auth.ts:20-21`, `lib/session.ts:16-23` | Add `sessionVersion`/`credentialsUpdatedAt` to User, embed in JWT, reject stale in `getCurrentUser()` |
| SEC-4 | Low | A05 | No `upgrade-insecure-requests`; no app-level HTTP→HTTPS redirect (relies on host + HSTS) | `middleware.ts:48-60` | Add `upgrade-insecure-requests` to CSP; confirm platform redirect |
| SEC-5 | Low | A05 | Security headers skip excluded static paths | `middleware.ts:106-108` | Set at least HSTS globally via `next.config.mjs headers()` |
| SEC-6 | Low | A07 | No password complexity / breached-password check (min-len 8 only) | `lib/validations.ts:12,35` | Add zxcvbn/HIBP check |
| SEC-7 | Low | A04 | OTP send throttled per-IP only; a single phone number is SMS-bombable via IP rotation (~120/hr) | `app/api/auth/phone-otp/send/route.ts:16`, `lib/otp-service.ts:26-29` | Add per-phone hourly cap (as verify route already does) |
| SEC-8 | Low | A07 | Email address never verified at registration (phone is) | `app/(auth)/actions.ts:147-162` | Add email verification step |
| SEC-9 | Low | A03 | Two admin free-text fields bypass zod (no length cap): ban `reason`, ticket `response` | `app/admin/actions.ts:354,625` | Add `.max(500)` zod schemas |
| SEC-10 | Low | A03 | `chartImageUrl` accepts `javascript:`/`data:` URLs (not currently rendered as a sink) | `lib/validations.ts:62` | `.refine(v => /^https?:\/\//.test(v))` |

**Verified OK (no action):** per-request **nonce CSP** with `strict-dynamic` and no `unsafe-inline`/`unsafe-eval` in prod scripts (`middleware.ts:39-103`, `app/layout.tsx:43-50`); **clickjacking** fully blocked (`X-Frame-Options: DENY` + `frame-ancestors 'none'`); HSTS/X-Content-Type-Options/Referrer-Policy/Permissions-Policy present; **CSRF** same-origin check on every mutating route (`lib/csrf.ts`) + Next 15 server-action origin check; **Razorpay webhook** HMAC verified with `timingSafeEqual`; **cookies** `HttpOnly`/`Secure`/`SameSite=Lax`/`__Secure-` (NextAuth v5 defaults); **no IDOR** (payment verify enforces `payment.userId !== user.id → 404`; all reads/writes filter by `userId`); **no priv-esc** (`role: "USER"` hardcoded at signup; role always read from DB, never JWT; self-role/self-ban and last-admin protected); **rate limiting** DB-atomic with per-IP + per-failed-account split; **account enumeration** avoided; **PII** AES-256-GCM + HMAC blind index (`lib/pii.ts`); **no error/stack-trace leakage**; **no over-fetch** of `passwordHash`/PII to clients.

---

## 3. Dependency Audit (`npm audit`)

**8 vulnerabilities: 2 high, 5 moderate, 1 low.**

| Severity | Package | Advisory | Path / usage |
|---|---|---|---|
| High | `nodemailer` | SMTP command injection via `envelope.size` | email sending (`lib/email.ts`) — via `next-auth`/`@auth/core` |
| High | `form-data` | CRLF injection via unescaped multipart field names | transitive |
| Moderate | `postcss` (<8.5.10) | XSS via unescaped `</style>` in stringify | build-time (via `next`) |
| Moderate | `next` | depends on vulnerable `postcss` | framework |
| Moderate | `next-auth` / `@auth/core` | transitive (nodemailer/next) | auth |
| Moderate | `js-yaml` | quadratic-complexity DoS on merge keys | transitive |
| Low | `esbuild` | dev-server arbitrary file read (**Windows dev only**) | dev tooling |

**Action:** run `npm audit fix` (non-breaking) first; review `nodemailer`/`form-data` — the SMTP-injection risk applies only if user-controlled input reaches `nodemailer` envelope fields (currently email content is templated server-side, so exposure is low, but patch it). Avoid `npm audit fix --force` blindly — it wants to downgrade `next` to 9.x (breaking).

---

## 4. Functional Findings (code review)

> Route/form inventory is in the Appendix (§12). No dead internal links and no `TODO`/`FIXME`/`href="#"` markers were found anywhere. Every navbar/footer/sidebar link resolves to an existing page.

| ID | Severity | Issue | Location | Fix |
|---|---|---|---|---|
| FUNC-1 | ~~Critical~~ **FIXED** | Production build failed to compile (2 ESLint errors: unescaped apostrophe in "Today's trades" + `any` in DottedSurface) | `app/admin/trades/page.tsx:86`, `components/ui/dotted-surface.tsx:121` | **Fixed during audit** — build now passes |
| FUNC-2 | Medium | Register form schedules `router.push` via `setTimeout` **in the render body** (not an effect) → duplicate navigations/timers on re-render | `components/auth/register-form.tsx` | Move into `useEffect` (as `reset-password-form.tsx` correctly does) |
| FUNC-3 | Low | No route-level loading states — **zero `loading.tsx`** under `app/**`; several pages are `force-dynamic` + hit the DB | `app/**` | Add `loading.tsx` with the existing `Skeleton` for dashboard/admin segments |
| FUNC-4 | Low | Several admin state-change actions silently no-op on rejection (last-admin, self-ban, bad id) — no error toast | `app/admin/actions.ts` (`updateTradeStatusAction`, `toggleAnalystActiveAction`, `updateUserRoleAction`, `toggleUserBanAction`, `togglePlanActiveAction`, `resolveSupportTicketAction`) | Return `ActionState` and surface a toast |
| FUNC-5 | Low | `BillingCheckout` free-plan activation silently returns if `accessToken` missing — a free public plan via `/dashboard/billing?plan=` would render a button that does nothing | `components/billing-checkout.tsx` | Ensure free public plans always carry a token, or handle tokenless free activation |
| FUNC-6 | Info | Contact page has no form (informational: mailto + "raise a ticket") — by design | `app/(marketing)/contact/page.tsx` | Confirm intended |
| FUNC-7 | Low | Razorpay verify-failure leaves user on billing page with no retry/route (toast says "contact support if charged") | `components/billing-checkout.tsx` | Add retry/return CTA |

---

## 5. Cross-Browser & Responsive — ⏳ NOT RUN

Requires a live server + Playwright. Breakpoints to verify: **375px / 768px / 1440px+**. Priority areas from code: the mobile pricing carousel (`pricing-table.tsx`), dashboard/admin sidebar drawers, hero visual (`dotted-surface.tsx`), and the trades watermark overlay. Script in §11.

---

## 6. Performance — ⏳ NOT RUN

Requires Lighthouse/k6 on a live server. Static observations: no `next/image` usage anywhere (marketing visuals are CSS/SVG — good for LCP, but confirm any future raster images use `next/image`); Three.js `DottedSurface` on the homepage is the main JS-weight/animation risk — verify its effect on INP/LCP and that `prefers-reduced-motion` is honored. Bundle sizes printed clean in the build. Script in §11.

---

## 7. SEO & Metadata

| ID | Severity | Issue | Location | Fix |
|---|---|---|---|---|
| SEO-1 | Medium | No Open Graph / Twitter **image** (`summary_large_image` card with no image) | `app/layout.tsx:32-38` | Add `app/opengraph-image.png` or `openGraph.images` |
| SEO-2 | Medium | No **favicon** / app icon (`app/icon.*`, `favicon.ico` absent) | `app/`, `public/` | Add `app/icon.png` + `apple-icon.png` |
| SEO-3 | Low | No **canonical** URLs anywhere | `app/layout.tsx`, pages | Add `alternates.canonical` |
| SEO-4 | Low | Auth pages indexable + description-less (in sitemap, not disallowed) | `app/(auth)/*/page.tsx`, `app/sitemap.ts:6` | `robots:{index:false}` + drop from sitemap |

**Verified OK:** root `metadataBase` + title template + description + OG + Twitter card + `robots`; unique title/description per marketing page; `robots.ts` + `sitemap.ts` present and correct; homepage JSON-LD (`FinancialService`).

---

## 8. Accessibility (static-detectable)

| ID | Severity | Issue | Location | Fix |
|---|---|---|---|---|
| A11Y-1 | Low | Read-only "copy link" input has no label/aria-label | `components/admin/copy-link.tsx:22-27` | `aria-label="Shareable link"` |
| A11Y-2 | Low | Backdrop overlay `onClick` on non-interactive `<div>` with no keyboard equivalent | `admin-shell.tsx:116`, `dashboard-shell.tsx:113` | Ensure Esc/close-button dismisses |

**Verified OK:** consistent `Label`+`htmlFor`/`id`; checkboxes wrapped in `<label>`; broadcast channels in `<fieldset>`/`<legend>`; icon-only buttons carry `aria-label`; nav toggle sets `aria-expanded`; semantic landmarks (`header`/`nav`/`main`/`footer`); `role="alert"`/`role="status"` live regions; no `<img>` → no missing-alt issues.

**Needs runtime (axe/Lighthouse):** color contrast of the dark "midnight terminal" palette (most likely AA failure); focus-visible + keyboard operability of drawers/carousel/theme-toggle; `prefers-reduced-motion` for hero/counters; screen-reader announcement of animated counters + SSE toasts.

---

## 9. Content & Legal

| ID | Severity | Issue | Location | Fix |
|---|---|---|---|---|
| LEG-1 | **High** | **No cookie-consent banner or cookie policy** anywhere. For an Indian fintech collecting PAN/Aadhaar, the **DPDP Act 2023** requires an explicit consent notice; GDPR applies for EU visitors. (`ComplianceBanner` is a market-risk disclaimer, not consent.) | repo-wide; `components/compliance-banner.tsx` | Add consent mechanism + cookie section in Privacy Policy; obtain explicit consent for KYC processing |
| LEG-2 | Medium | Brand inconsistency: homepage stat hint says "Wealth**desk**" vs "Wealth Research Desk" everywhere else | `app/(marketing)/page.tsx:63` | Correct to "Wealth Research Desk" |
| LEG-3 | Low | "Active Users" counter adds a hardcoded **+139** baseline to real signups — possible misrepresentation for a regulated fintech. **(Intentional — per your earlier request; flagging for compliance awareness.)** | `app/(marketing)/page.tsx:47-48,63` | Reconsider showing a true count |
| LEG-4 | Low | Placeholder copy live: "Analyst profiles will be published soon." while "multi-analyst desk" is a selling point | `app/(marketing)/about/page.tsx` | Publish or remove |
| LEG-5 | Low | SEBI reg / GSTIN fall back to dummy values (`INH000000000`, `27AAAAA0000A1Z5`) shown publicly if env unset | `components/public-footer.tsx:19-20,58-59` | Ensure env set in prod; hide block if absent |

**Verified OK:** all four legal pages exist (Disclaimer, Privacy, Terms, Refund) with substantive fintech copy, DB-overridable; footer links to all; Privacy addresses PAN/Aadhaar + Razorpay; no lorem/placeholder in marketing copy.

---

## 10. Quick Wins vs Larger Fixes

### Quick wins — ✅ ALL APPLIED (2026-07-05)
- ✅ **Build fix** — unescaped apostrophe + `any` removed; build green. *(FUNC-1)*
- ✅ `npm audit fix` — vulnerabilities **8 → 5** (remaining 5 need a breaking Next downgrade, deferred). 
- ✅ Favicon `app/icon.svg` + generated `app/opengraph-image.tsx` (next/og). *(SEO-1/2)*
- ✅ "Wealthdesk" → "Wealth Research Desk". *(LEG-2)*
- ✅ `aria-label="Shareable access link"` on copy-link input. *(A11Y-1)*
- ✅ Length caps on ban reason (500) + ticket response (2000). *(SEC-9)*
- ✅ `chartImageUrl` restricted to `http(s)` scheme. *(SEC-10)*
- ✅ `robots:{index:false}` on all 4 auth pages + removed from sitemap. *(SEO-4)*
- ✅ Register-form redirect moved into `useEffect`. *(FUNC-2)*
- ✅ CSP: `img-src` scoped (no `https:` wildcard) + `upgrade-insecure-requests` added. *(SEC-2/4)*

> All quick wins verified via `tsc --noEmit` (clean) + `next build` (passes). Remaining Medium/Low and all Highs (cookie consent, session revocation, dep majors) are in the "Larger fixes" list below and unchanged.

### Larger fixes (design/coordination)
- ✅ **DONE — Cookie consent + DPDP compliance.** Consent banner (`components/cookie-consent.tsx`, Accept/Reject) + Cookie Policy in Privacy Policy (fallback + live DB override). *(LEG-1)*
- ✅ **DONE — Session revocation on password reset.** `User.sessionVersion` bumped on reset; embedded in JWT; stale tokens rejected in `getCurrentUser()`. Logs out all sessions on reset; no forced re-login on deploy. *(SEC-3)*
- ✅ **DONE — Password strength.** Register + reset require a letter+number and reject common passwords (`lib/validations.ts`). *(SEC-6)*
- ✅ **DONE — Per-phone OTP cap.** 5/hour per number added to the send route. *(SEC-7)*
- ✅ **DONE — Loading skeletons.** `app/dashboard/loading.tsx` + `app/admin/loading.tsx`. *(FUNC-3)*
- ◑ **PARTIAL — Admin action feedback.** Users page role/ban guards now redirect back with a warning banner (`?error=`). Same pattern still to apply to trade-status / analyst-toggle / plan-toggle / ticket-resolve. *(FUNC-4)*
- Email verification flow — still open (larger; needs email token + verify route/page). *(SEC-8)*

---

## 11. Runtime Verification — scripts to run locally

Everything below needs `npm run dev` (or `npm run start` after `npm run build`) running at `http://localhost:3000`.

```bash
# --- Cross-browser & responsive (Playwright) ---
npx playwright install
npx playwright test            # after writing specs, or use codegen:
npx playwright codegen http://localhost:3000

# --- Lighthouse (Performance / A11y / Best-Practices / SEO + Core Web Vitals) ---
npx lighthouse http://localhost:3000 --view
npx lighthouse http://localhost:3000/membership --view
npx lighthouse http://localhost:3000/dashboard --view   # needs auth cookie

# --- Accessibility (axe) ---
npx @axe-core/cli http://localhost:3000

# --- Load test (autocannon) on a public endpoint ---
npx autocannon -c 50 -d 20 http://localhost:3000/api/subscriptions/plans

# --- Live security header / cookie inspection ---
curl -sI https://<prod-url>/ | grep -iE 'content-security|strict-transport|x-frame|x-content|referrer|permissions'
# After login, inspect Set-Cookie for __Secure-authjs.session-token; HttpOnly; Secure; SameSite=Lax
```

**Runtime items to confirm (consolidated):**
- `NODE_ENV=production` in prod (else dev OTP `devCode` could be returned — `lib/otp-service.ts:61`).
- Distinct strong secrets set: `AUTH_SECRET`, `PII_ENCRYPTION_KEY`, `PHONE_OTP_SECRET` (the latter two fall back to `AUTH_SECRET`).
- Reverse proxy overwrites `x-forwarded-for` (rate-limit/audit IPs derive from it; spoofable otherwise).
- Razorpay webhook is configured/reachable in prod (authoritative grant path).
- CSP/HSTS/X-Frame-Options actually present on prod responses; no CSP violations from Razorpay `checkout.js`.
- `SEBI_REGISTRATION` / `GSTIN` env vars set (else dummy values shown).
- Confirm `/dashboard/history` being open to non-plan users is intended **(it is — per your earlier request).**

---

## 12. Appendix — Route & Form Inventory

**Access model:** `middleware.ts` cookie-gates `/dashboard` and `/admin`; authoritative checks in `lib/session.ts` (`requireUser`, `requireAdmin`, `getApiUser`, `getCurrentUser`). Admin pages all gated by `app/admin/layout.tsx` → `requireAdmin()`.

**Public/marketing:** `/`, `/about`, `/contact`, `/faq`, `/membership`, `/performance`, `/legal/[slug]` (disclaimer|privacy|terms|refund), `/plans/[token]` (private-plan link).
**Auth:** `/login`, `/register` (2-step w/ phone OTP), `/forgot-password`, `/reset-password`.
**Member (auth):** `/dashboard`, `/trades`, `/outlook`, `/history`, `/notifications`, `/subscription`, `/billing`, `/support`.
**Admin (ADMIN-only):** `/admin` + `analytics`, `trades`, `outlooks`, `analysts`, `users`, `plans`, `subscriptions`, `payments`, `trials`, `notifications`, `support`, `content`, `audit`.
**API:** `auth/[...nextauth]`, `auth/phone-otp/{send,verify}`, `subscriptions/{plans(GET),create-order,verify}`, `plans/redeem`, `trial/activate`, `trades(GET)`, `outlooks(GET)`, `notifications/{live,stream}(GET)`, `webhooks/razorpay` (HMAC), `admin/revenue/export` (CSV, admin).

**Forms:** login, register (2-step), forgot/reset password, member support ticket, checkout (`BillingCheckout`: free-redeem / paid Razorpay / trial), and admin forms — trade, index, trade-status, outlook, analyst, plan (create/update), broadcast, managed-content, user-role, ban/unban, resolve-ticket. All use the `useActionState` + `ActionState{status,message}` pattern.

**34 client components** including the mobile pricing carousel, Razorpay checkout, SSE live-notifications, content-guard watermark, theme provider/toggle, and 7 admin query-param filter bars.

---

*Generated by an automated code-and-config audit (5 parallel review agents + tooling). Runtime/browser-dependent sections are explicitly marked NOT RUN and must be validated on a live deployment using §11.*
