import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Resolves the current user FROM THE DATABASE on every call.
 * This guarantees a banned user (or one whose role changed) is rejected
 * immediately, instead of trusting a long-lived JWT.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.isBanned) return null;
  return user;
}

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
