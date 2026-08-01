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

/**
 * The current secret used to ENCRYPT new values, followed by any older secrets
 * still needed to DECRYPT previously-stored values. Supports zero-loss key
 * rotation: set PII_ENCRYPTION_KEY to the new key and PII_ENCRYPTION_KEY_PREVIOUS
 * to the old one (and/or rely on AUTH_SECRET/AUTH_SECRET_PREVIOUS as fallbacks).
 * Without this, rotating AUTH_SECRET while relying on the fallback would make
 * every stored PAN/Aadhaar undecryptable.
 */
function decryptSecrets(): string[] {
  const ordered = [
    process.env.PII_ENCRYPTION_KEY,
    process.env.PII_ENCRYPTION_KEY_PREVIOUS,
    process.env.AUTH_SECRET,
    process.env.AUTH_SECRET_PREVIOUS
  ].filter((s): s is string => Boolean(s && s.trim()));
  const unique = [...new Set(ordered)];
  if (unique.length === 0) {
    throw new Error("PII encryption secret missing (PII_ENCRYPTION_KEY / AUTH_SECRET)");
  }
  return unique;
}

/** The single secret used to encrypt new values (first of the decrypt set). */
function currentSecret(): string {
  return decryptSecrets()[0];
}

/** 32-byte AES key derived from a given secret. */
function encryptionKeyFor(secret: string): Buffer {
  return crypto.createHash("sha256").update(`pii-enc:${secret}`).digest();
}

/** Separate key for the deterministic blind index (domain-separated). */
function indexKey(): Buffer {
  return crypto.createHash("sha256").update(`pii-idx:${currentSecret()}`).digest();
}

export function encryptPii(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKeyFor(currentSecret()), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptPii(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext - return as-is
  let packed: Buffer;
  try {
    packed = Buffer.from(value.slice(PREFIX.length), "base64");
  } catch {
    return null;
  }
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);
  // Try the current key first, then any rotated-out secrets, so a key rotation
  // never orphans previously-encrypted values.
  for (const secret of decryptSecrets()) {
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKeyFor(secret), iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    } catch {
      // wrong key (auth tag mismatch) — try the next
    }
  }
  return null;
}

/** Deterministic HMAC for uniqueness lookups. Input is normalized first. */
export function blindIndex(value: string): string {
  return crypto.createHmac("sha256", indexKey()).update(value.trim().toUpperCase()).digest("hex");
}
