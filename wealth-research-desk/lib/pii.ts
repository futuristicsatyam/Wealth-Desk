import crypto from "crypto";

/**
 * Encryption-at-rest for sensitive KYC fields (PAN, Aadhaar).
 *
 * - `encryptPii` / `decryptPii` use AES-256-GCM with a random IV per value, so
 *   the same plaintext yields different ciphertext (no equality leakage).
 * - Ciphertext is tagged with a "v1:" prefix; `decryptPii` returns any value
 *   WITHOUT that prefix unchanged, so rows written before encryption was
 *   introduced keep working until they are migrated.
 * - Because GCM ciphertext is non-deterministic, uniqueness can't be enforced
 *   on it directly. `blindIndex` produces a deterministic HMAC used in a
 *   separate unique column for duplicate detection.
 */

const PREFIX = "v1:";

function rawSecret(): string {
  const secret = process.env.PII_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!secret) throw new Error("PII encryption secret missing (PII_ENCRYPTION_KEY / AUTH_SECRET)");
  return secret;
}

/** 32-byte AES key derived from the configured secret. */
function encryptionKey(): Buffer {
  return crypto.createHash("sha256").update(`pii-enc:${rawSecret()}`).digest();
}

/** Separate key for the deterministic blind index (domain-separated). */
function indexKey(): Buffer {
  return crypto.createHash("sha256").update(`pii-idx:${rawSecret()}`).digest();
}

export function encryptPii(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptPii(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext - return as-is
  try {
    const packed = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const ciphertext = packed.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Deterministic HMAC for uniqueness lookups. Input is normalized first. */
export function blindIndex(value: string): string {
  return crypto.createHmac("sha256", indexKey()).update(value.trim().toUpperCase()).digest("hex");
}
