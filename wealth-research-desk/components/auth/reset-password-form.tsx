"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { resetPasswordAction, type ActionState } from "@/app/(auth)/actions";

const initialState: ActionState = { status: "idle", message: "" };

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  useEffect(() => {
    if (state.status === "success") {
      const timer = setTimeout(() => router.push("/login?reset=1"), 1200);
      return () => clearTimeout(timer);
    }
  }, [state.status, router]);

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Invalid reset link</h1>
        <InlineToast tone="error" message="This reset link is missing its token." />
        <Link href="/forgot-password" className="text-sm text-accent">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted">Choose a strong password you have not used before.</p>
      </div>

      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && <InlineToast tone="success" message={state.message} />}

      {state.status !== "success" && (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <div>
            <Label htmlFor="password">New password (min 8 characters)</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" required />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Updating..." : "Update password"}
          </Button>
        </form>
      )}
    </div>
  );
}
