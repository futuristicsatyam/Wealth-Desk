/**
 * One-time, idempotent migration: encrypt any legacy plaintext PAN/Aadhaar
 * values and backfill the blind-index hashes used for uniqueness.
 *
 * Safe to run repeatedly - rows already encrypted (value starts with "v1:")
 * with a hash present are skipped. Run with: tsx prisma/migrate-pii.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { encryptPii, decryptPii, blindIndex } from "../lib/pii";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, panNumber: true, aadhaarNumber: true, panHash: true, aadhaarHash: true }
  });

  let updated = 0;
  for (const user of users) {
    const data: Record<string, string> = {};

    const panPlain = decryptPii(user.panNumber);
    if (panPlain && (!user.panNumber?.startsWith("v1:") || !user.panHash)) {
      data.panNumber = encryptPii(panPlain);
      data.panHash = blindIndex(panPlain);
    }

    const aadhaarPlain = decryptPii(user.aadhaarNumber);
    if (aadhaarPlain && (!user.aadhaarNumber?.startsWith("v1:") || !user.aadhaarHash)) {
      data.aadhaarNumber = encryptPii(aadhaarPlain);
      data.aadhaarHash = blindIndex(aadhaarPlain);
    }

    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: user.id }, data });
      updated += 1;
    }
  }

  console.log(`PII migration complete. Updated ${updated} of ${users.length} users.`);
}

main()
  .catch((error) => {
    console.error("PII migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
