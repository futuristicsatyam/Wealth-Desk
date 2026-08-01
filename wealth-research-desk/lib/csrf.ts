import type { NextRequest } from "next/server";

/**
 * Same-origin check for state-changing API requests.
 * Compares the Origin header host against the request host.
 */
export function verifyOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function getClientIp(request: NextRequest): string {
  // Prefer `x-real-ip`: on Vercel (and most managed platforms) the edge sets this
  // to the true client IP and a client cannot forge it through the proxy. The
  // first value of a client-supplied `x-forwarded-for` is attacker-controlled, so
  // it is only a last-resort fallback (local/dev, no trusted proxy).
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || "unknown";
}
