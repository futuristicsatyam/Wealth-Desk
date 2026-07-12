# Load testing (k6)

Finds the real concurrency ceiling before you rely on it. The script ramps
**0 → 200 → 500 → 1000** virtual users and reports where latency/errors break.

## What it exercises
- **Public DB pages** (`/`, `/performance`, `/membership`, …) — the actual
  Prisma/Neon load under many simultaneous visitors.
- **Notification poll** (`/api/notifications/live`) — the per-active-user hot
  path that replaced the old SSE connection. This is the load that scales 1:1
  with active dashboard users, so it's the most important signal.

## Install k6
```bash
# macOS
brew install k6
# Debian/Ubuntu
sudo gpg -k && sudo apt-get install -y k6   # or: https://k6.io/docs/get-started/installation
```

## Run
```bash
# Public pages only (no login needed)
k6 run -e BASE_URL=https://wealthdesk-murex.vercel.app k6-load-test.js

# Include the authenticated poll (recommended — it's the hot path)
k6 run \
  -e BASE_URL=https://wealthdesk-murex.vercel.app \
  -e SESSION_COOKIE="__Secure-authjs.session-token=eyJ..." \
  k6-load-test.js

# Smaller/quicker run
k6 run -e BASE_URL=... -e PEAK_VUS=300 -e HOLD=1m k6-load-test.js
```

### Getting the SESSION_COOKIE
1. Log in as a member in your browser.
2. DevTools → Application → Cookies → your domain.
3. Copy the session cookie: `__Secure-authjs.session-token` on https
   (`authjs.session-token` on http). Pass it as `name=value`.

## Reading the result
The summary prints p95/p99 latency and error rates. The run **fails** (non-zero
exit) if any threshold is breached:
- `http_req_failed < 1%`, `page_errors < 1%`, `poll_errors < 2%`
- `http_req_duration p95 < 1000ms / p99 < 2500ms`, `poll_latency p95 < 800ms`

Watch for the VU level where p95 climbs sharply or errors appear — that's your
ceiling on the current tier. Common first bottleneck is the **DB connection
pool**: if you see `P2024`/timeout errors, raise Neon's compute and tune
`connection_limit` in `DATABASE_URL`.

## ⚠️ Important
- **Test against staging, not production**, or during a quiet window — 1000 VUs
  is real traffic and will spike your Neon compute + Vercel usage (and cost).
- The script only hits **safe GET paths**. It deliberately does **not** touch
  checkout/`create-order` (that would create real Razorpay orders) or any
  write/broadcast endpoint.
- Generating 1000 VUs needs a capable machine or [k6 Cloud](https://k6.io/cloud/);
  from a laptop you may saturate local CPU/network before the server does —
  if local numbers look bad, confirm the client isn't the bottleneck.
- Do a baseline run at low VUs first (`-e PEAK_VUS=50`) to confirm wiring and
  the session cookie work before the big run.
