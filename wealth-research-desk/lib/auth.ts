import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

// Supports zero-downtime secret rotation.
const secrets = [env.AUTH_SECRET, env.AUTH_SECRET_PREVIOUS]
  .filter((value): value is string => Boolean(value && value.trim()));

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: secrets.length === 1 ? secrets[0] : secrets,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  jwt: { maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() }
        });
        if (!user || user.isBanned) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          sessionVersion: user.sessionVersion
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string) ?? "USER";
        // Default to 0 so pre-existing tokens (issued before this field) match
        // a freshly-migrated user's default 0 and are NOT force-logged-out.
        session.user.sessionVersion = (token.sessionVersion as number | undefined) ?? 0;
      }
      return session;
    }
  }
});
