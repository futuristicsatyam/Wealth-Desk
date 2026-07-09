import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      sessionVersion: number;
    };
  }
  interface User {
    role?: string;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    sessionVersion?: number;
  }
}
