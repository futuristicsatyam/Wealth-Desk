import type { Role } from "@prisma/client";

export function hasRole(current: Role | undefined | null, allowed: Role[]): boolean {
  return current != null && allowed.includes(current);
}

export const STAFF_ROLES: Role[] = ["ANALYST", "ADMIN"];
export const ADMIN_ROLES: Role[] = ["ADMIN"];
