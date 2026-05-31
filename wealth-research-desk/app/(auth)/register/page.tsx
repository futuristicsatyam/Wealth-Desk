import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return <RegisterForm />;
}
