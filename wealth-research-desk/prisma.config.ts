import path from "node:path";
// A Prisma config file disables automatic .env loading, so load it explicitly.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts"
  }
});
