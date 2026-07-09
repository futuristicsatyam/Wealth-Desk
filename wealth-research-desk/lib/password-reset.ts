import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const RESET_TTL_HOURS = 2;

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Creates a reset token for a user and returns the raw token (emailed to user). */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_HOURS * 60 * 60 * 1000);

  // Invalidate any previous unused tokens for this user.
  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
  await prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
  return rawToken;
}

/**
 * Consumes a reset token and updates the password. Returns the affected user on
 * success (so the caller can audit-log it), or null when the token is invalid.
 */
export async function consumePasswordReset(
  rawToken: string,
  newPassword: string
): Promise<{ userId: string; userName: string } | null> {
  const tokenHash = hashResetToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return null;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      // Bump sessionVersion so every previously-issued JWT is invalidated —
      // resetting the password logs the user out of all existing sessions.
      data: { passwordHash, sessionVersion: { increment: 1 } },
      select: { id: true, name: true }
    }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } })
  ]);
  return { userId: user.id, userName: user.name };
}
