"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { loginAction, type ActionState } from "@/app/(auth)/actions";

const INITIAL_STATE: ActionState = { status: "idle", message: "" };

export function LoginForm() {
  const params = useSearchParams();
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);

  const justRegistered = params.get("registered") === "1";
  const justReset = params.get("reset") === "1";
  const nextPath = params.get("next") || "/dashboard";
  const authRequired = params.get("error") === "auth_required";
  const error = authRequired ? "Please sign in to continue." : state.status === "error" ? state.message : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted">Access your research dashboard.</p>
      </div>

      {justRegistered && <InlineToast tone="success" message="Account created. Please sign in." />}
      {justReset && <InlineToast tone="success" message="Password updated. Please sign in." />}
      {error && <InlineToast tone="error" message={error} />}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={nextPath} />
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="mb-1.5 text-xs text-accent">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="text-accent">
          Create an account
        </Link>
      </p>
    </div>
  );
}
