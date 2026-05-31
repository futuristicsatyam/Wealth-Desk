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
  const now = Date.now();
  const expiresAt = new Date(now + windowMs);

  const existing = await prisma.rateLimit.findUnique({ where: { id: key } });

  if (!existing || existing.expiresAt.getTime() <= now) {
    await prisma.rateLimit.upsert({
      where: { id: key },
      create: { id: key, hits: 1, expiresAt },
      update: { hits: 1, expiresAt }
    });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (existing.hits >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((existing.expiresAt.getTime() - now) / 1000)
    };
  }

  await prisma.rateLimit.update({
    where: { id: key },
    data: { hits: { increment: 1 } }
  });
  return { allowed: true, remaining: limit - existing.hits - 1, retryAfterSec: 0 };
}
