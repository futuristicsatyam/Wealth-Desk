"use client";

import { useActionState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { changePasswordAction, type ActionState } from "@/app/dashboard/actions";

const initialState: ActionState = { status: "idle", message: "" };

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  // Changing the password bumps sessionVersion, which invalidates this browser's
  // session too. Sign out cleanly and send the user to log in with the new one.
  useEffect(() => {
    if (state.status === "success") {
      const timer = setTimeout(() => signOut({ callbackUrl: "/login?passwordChanged=1" }), 1500);
      return () => clearTimeout(timer);
    }
  }, [state.status]);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && (
        <InlineToast tone="success" message={`${state.message} Signing you out...`} />
      )}

      <div>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
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
      <Button type="submit" disabled={pending || state.status === "success"}>
        {pending ? "Updating..." : "Update password"}
      </Button>
      <p className="text-xs text-muted">
        For your security, changing your password signs you out of all devices.
      </p>
    </form>
  );
}
