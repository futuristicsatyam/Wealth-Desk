"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { createAnalystAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = { status: "idle", message: "" };

export function AnalystForm() {
  const [state, formAction, pending] = useActionState(createAnalystAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && <InlineToast tone="success" message={state.message} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="experienceYears">Experience (years)</Label>
          <Input id="experienceYears" name="experienceYears" type="number" min="0" max="60" required />
        </div>
        <div>
          <Label htmlFor="specialization">Specialization</Label>
          <Input id="specialization" name="specialization" placeholder="e.g. Derivatives" required />
        </div>
      </div>
      <div>
        <Label htmlFor="sebiRegistration">SEBI registration number</Label>
        <Input id="sebiRegistration" name="sebiRegistration" placeholder="INH000000000" required />
      </div>
      <div>
        <Label htmlFor="bio">Short bio</Label>
        <Textarea id="bio" name="bio" rows={3} required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add analyst"}
      </Button>
    </form>
  );
}
