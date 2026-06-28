"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { createTradeIndexAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = { status: "idle", message: "" };

export function IndexForm() {
  const [state, formAction, pending] = useActionState(createTradeIndexAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && <InlineToast tone="success" message={state.message} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Index name</Label>
          <Input id="name" name="name" placeholder="e.g. NIFTY" required />
        </div>
        <div>
          <Label htmlFor="lotSize">Lot size</Label>
          <Input id="lotSize" name="lotSize" type="number" min="1" step="1" required />
        </div>
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Creating..." : "Create index"}
      </Button>
    </form>
  );
}
