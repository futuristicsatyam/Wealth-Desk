import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading...</p>}>
      <LoginForm />
    </Suspense>
  );
}
