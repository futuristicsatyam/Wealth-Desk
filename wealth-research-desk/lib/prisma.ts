import { PrismaClient } from "@prisma/client";

/**
 * Retry only errors that mean a connection was never acquired, so the query
 * provably never executed - retrying cannot cause a duplicate write. These are
 * the transient failures Neon's serverless compute throws while waking from
 * auto-suspend (cold start), which otherwise surface as P2024 pool timeouts.
 */
const CONNECTION_ERROR_CODES = new Set([
  "P2024", // Timed out fetching a new connection from the pool
  "P1001", // Can't reach database server
  "P1002" // Database server reached but timed out on connect
]);

function isColdStartError(error: unknown): boolean {
  const err = error as { code?: string; name?: string; message?: string };
  if (err?.code && CONNECTION_ERROR_CODES.has(err.code)) return true;
  if (err?.name === "PrismaClientInitializationError") return true;
  const message = String(err?.message ?? "");
  return /connection pool|can't reach database|timed out fetching/i.test(message);
}

/** Retry a Prisma operation through a cold start with short exponential backoff. */
async function withColdStartRetry<T>(run: () => Promise<T>): Promise<T> {
  const backoffMs = [300, 900, 1800];
  let lastError: unknown;
  for (let attempt = 0; attempt <= backoffMs.length; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt === backoffMs.length || !isColdStartError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt]));
    }
  }
  throw lastError;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Reuse the base client (and its connection pool) across dev hot-reloads.
const base =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = base;
}

// Every operation - model queries and raw queries alike - is transparently
// retried through a cold start.
export const prisma = base.$extends({
  query: {
    $allOperations({ args, query }) {
      return withColdStartRetry(() => query(args));
    }
  }
});
