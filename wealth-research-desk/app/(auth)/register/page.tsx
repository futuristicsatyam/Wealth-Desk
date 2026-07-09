import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;
  const initialReferralCode = (params.ref ?? "").trim().toUpperCase();

  return <RegisterForm initialReferralCode={initialReferralCode} />;
}
