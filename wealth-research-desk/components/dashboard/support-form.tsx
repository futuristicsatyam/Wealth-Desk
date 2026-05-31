"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { createSupportTicketAction, type ActionState } from "@/app/dashboard/actions";

const initialState: ActionState = { status: "idle", message: "" };

export function SupportForm() {
  const [state, formAction, pending] = useActionState(createSupportTicketAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && <InlineToast tone="success" message={state.message} />}
      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" placeholder="Brief summary of your issue" required />
      </div>
      <div>
        <Label htmlFor="priority">Priority</Label>
        <Select id="priority" name="priority" defaultValue="MEDIUM">
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={5} placeholder="Describe your issue in detail" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting..." : "Submit ticket"}
      </Button>
    </form>
  );
}
