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

/** Consumes a reset token and updates the password. Returns true on success. */
export async function consumePasswordReset(rawToken: string, newPassword: string): Promise<boolean> {
  const tokenHash = hashResetToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return false;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } })
  ]);
  return true;
}
