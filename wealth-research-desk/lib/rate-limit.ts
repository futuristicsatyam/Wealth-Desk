import { prisma } from "@/lib/prisma";

/**
 * Database-backed rate limiter. Works correctly on serverless / multi-instance
 * deployments (unlike an in-memory Map). Used for auth-sensitive endpoints.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; retryAfterSec: number }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);

  // Atomically start a fresh window if the previous one has expired. This is a
  // no-op for an active window, and is safe under concurrency (a second racing
  // reset just re-applies the same values).
  await prisma.rateLimit.updateMany({
    where: { id: key, expiresAt: { lte: now } },
    data: { hits: 0, expiresAt }
  });

  // Atomic create-or-increment. The DB-level increment means concurrent
  // requests cannot lose counts, so the limit can never be silently exceeded.
  const record = await prisma.rateLimit.upsert({
    where: { id: key },
    create: { id: key, hits: 1, expiresAt },
    update: { hits: { increment: 1 } }
  });

  if (record.hits > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((record.expiresAt.getTime() - now.getTime()) / 1000))
    };
  }

  return { allowed: true, remaining: limit - record.hits, retryAfterSec: 0 };
}
