/**
 * Next.js instrumentation hook — runs once when the server starts.
 *
 * DEV-ONLY database keepalive. Neon free-tier compute auto-suspends after a few
 * minutes idle, and the cold-start wake causes slow queries and connection-pool
 * timeouts (P2024). Pinging the database every few minutes during development
 * keeps the compute warm so navigation stays fast.
 *
 * This intentionally does NOT run in production: there, steady traffic keeps the
 * DB warm and you would not want to hold a compute awake (and pay for it) just
 * because the server is running.
 */
export async function register() {
  // Only the Node.js server runtime can open a DB connection (skip Edge).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV === "production") return;

  // Guard against duplicate intervals across dev hot-reloads.
  const globalForKeepalive = globalThis as unknown as { __wrdKeepalive?: ReturnType<typeof setInterval> };
  if (globalForKeepalive.__wrdKeepalive) return;

  const { prisma } = await import("@/lib/prisma");
  const PING_MS = 4 * 60 * 1000; // 4 min, comfortably under Neon's ~5 min suspend window

  const ping = async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      // DB may be momentarily unreachable/waking; the next tick retries.
    }
  };

  void ping(); // warm immediately on startup
  const timer = setInterval(ping, PING_MS);
  timer.unref?.(); // never let the keepalive block process shutdown
  globalForKeepalive.__wrdKeepalive = timer;

  console.log("[keepalive] dev DB keepalive active (every 4 min)");
}
