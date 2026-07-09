import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Resolves the current user FROM THE DATABASE.
 * This guarantees a banned user (or one whose role changed) is rejected
 * immediately, instead of trusting a long-lived JWT.
 *
 * Wrapped in React `cache()` so multiple callers within the SAME request
 * (e.g. a route-group layout AND its page both calling requireUser) share a
 * single DB lookup instead of issuing a duplicate query per render.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.isBanned) return null;
  // Reject tokens issued before a credential change (e.g. password reset), so a
  // reset logs out every existing session, not just the browser that reset.
  if (session.user.sessionVersion !== user.sessionVersion) return null;
  return user;
});

/** For pages/layouts: redirects when not authenticated. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=auth_required");
  return user;
}

/** For pages/layouts: requires one of the given roles. */
export async function requireRole(roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export async function requireAdmin(): Promise<User> {
  return requireRole(["ADMIN"]);
}

export async function requireStaff(): Promise<User> {
  return requireRole(["ADMIN", "ANALYST"]);
}

/** For API routes: returns the user or null (caller decides the status code). */
export async function getApiUser(): Promise<User | null> {
  return getCurrentUser();
}
