"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { requestPasswordResetAction, type ActionState } from "@/app/(auth)/actions";

const initialState: ActionState = { status: "idle", message: "" };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Forgot your password?</h1>
        <p className="mt-1 text-sm text-muted">
          Enter your account email and we will send a reset link.
        </p>
      </div>

      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && <InlineToast tone="success" message={state.message} />}

      {state.status !== "success" && (
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-accent">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
