/**
 * k6 load test for Wealth Research Desk.
 *
 * Exercises the paths that actually decide concurrency:
 *   - Public, DB-backed pages (/, /performance, /membership) — the real
 *     Prisma/Neon load under many simultaneous visitors.
 *   - The per-active-user notification poll (/api/notifications/live) — the
 *     sustained request that scales 1:1 with active dashboard users. This is
 *     the load that replaced the old per-user SSE connection.
 *
 * Ramps 0 → 200 → 500 → 1000 VUs so you can watch where latency/errors break.
 *
 * Run:
 *   k6 run -e BASE_URL=https://wealthdesk-murex.vercel.app wealth-research-desk/loadtest/k6-load-test.js
 *
 * Include the authenticated poll (recommended — it's the hot path):
 *   1. Log in as a member in your browser.
 *   2. DevTools → Application → Cookies → copy the session cookie value
 *      (name is usually `__Secure-authjs.session-token` on https,
 *       `authjs.session-token` on http).
 *   3. Pass the whole Cookie header:
 *      k6 run -e BASE_URL=... -e SESSION_COOKIE="__Secure-authjs.session-token=eyJ..." k6-load-test.js
 *
 * Tune the ramp with -e PEAK_VUS=1000 -e HOLD=3m (see stages below).
 */
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SESSION_COOKIE = __ENV.SESSION_COOKIE || "";
const PEAK_VUS = Number(__ENV.PEAK_VUS || 1000);
const HOLD = __ENV.HOLD || "3m";

// Custom metrics so you can read each concern separately in the summary.
const pageErrors = new Rate("page_errors");
const pollErrors = new Rate("poll_errors");
const pollLatency = new Trend("poll_latency", true);

export const options = {
  scenarios: {
    // Anonymous visitors browsing public, DB-backed pages.
    browse: {
      executor: "ramping-vus",
      exec: "browse",
      startVUs: 0,
      stages: [
        { duration: "1m", target: Math.round(PEAK_VUS * 0.2) },
        { duration: "2m", target: Math.round(PEAK_VUS * 0.2) },
        { duration: "1m", target: Math.round(PEAK_VUS * 0.5) },
        { duration: "2m", target: Math.round(PEAK_VUS * 0.5) },
        { duration: "1m", target: PEAK_VUS },
        { duration: HOLD, target: PEAK_VUS },
        { duration: "1m", target: 0 }
      ],
      gracefulRampDown: "30s"
    },
    // Logged-in members whose dashboard polls for notifications. Only runs when
    // SESSION_COOKIE is provided. One shared session simulates the query shape
    // and load; it does not exercise per-user data variety.
    poll: {
      executor: "ramping-vus",
      exec: "poll",
      startVUs: 0,
      stages: [
        { duration: "1m", target: Math.round(PEAK_VUS * 0.2) },
        { duration: "2m", target: Math.round(PEAK_VUS * 0.2) },
        { duration: "1m", target: Math.round(PEAK_VUS * 0.5) },
        { duration: "2m", target: Math.round(PEAK_VUS * 0.5) },
        { duration: "1m", target: PEAK_VUS },
        { duration: HOLD, target: PEAK_VUS },
        { duration: "1m", target: 0 }
      ],
      gracefulRampDown: "30s"
    }
  },
  thresholds: {
    // Overall health gates — the test "fails" (non-zero exit) if breached.
    http_req_failed: ["rate<0.01"], // <1% requests error
    http_req_duration: ["p(95)<1000", "p(99)<2500"],
    page_errors: ["rate<0.01"],
    poll_errors: ["rate<0.02"],
    poll_latency: ["p(95)<800"]
  }
};

const PUBLIC_PAGES = ["/", "/performance", "/membership", "/faq", "/about"];

export function browse() {
  group("public pages", () => {
    const path = PUBLIC_PAGES[Math.floor(Math.random() * PUBLIC_PAGES.length)];
    const res = http.get(`${BASE_URL}${path}`, { tags: { name: "public_page" } });
    const ok = check(res, {
      "page 2xx/3xx": (r) => r.status >= 200 && r.status < 400
    });
    pageErrors.add(!ok);
  });
  // Think time: real users don't hammer. ~1 request every 3-8s per VU.
  sleep(3 + Math.random() * 5);
}

export function poll() {
  if (!SESSION_COOKIE) return; // no cookie → scenario is a no-op

  const after = new Date(Date.now() - 60_000).toISOString();
  const res = http.get(`${BASE_URL}/api/notifications/live?after=${encodeURIComponent(after)}`, {
    headers: { Cookie: SESSION_COOKIE },
    tags: { name: "notifications_poll" }
  });
  const ok = check(res, {
    "poll 200": (r) => r.status === 200
  });
  pollErrors.add(!ok);
  pollLatency.add(res.timings.duration);

  // Matches the client's 15s poll cadence.
  sleep(15);
}

export function handleSummary(data) {
  const line = (m) => {
    const v = data.metrics[m];
    if (!v) return `${m}: n/a`;
    const p = v.values;
    return `${m}: avg=${(p.avg ?? 0).toFixed(0)}ms p95=${(p["p(95)"] ?? 0).toFixed(0)}ms p99=${(p["p(99)"] ?? 0).toFixed(0)}ms`;
  };
  const rate = (m) => {
    const v = data.metrics[m];
    return v ? `${m}: ${(v.values.rate * 100).toFixed(2)}%` : `${m}: n/a`;
  };
  console.log("\n================ SUMMARY ================");
  console.log(line("http_req_duration"));
  console.log(line("poll_latency"));
  console.log(rate("http_req_failed"));
  console.log(rate("page_errors"));
  console.log(rate("poll_errors"));
  console.log("========================================\n");
  return { stdout: "" };
}
