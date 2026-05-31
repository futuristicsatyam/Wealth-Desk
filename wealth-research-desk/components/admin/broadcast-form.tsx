"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { broadcastNotificationAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = { status: "idle", message: "" };

export function BroadcastForm() {
  const [state, formAction, pending] = useActionState(broadcastNotificationAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && <InlineToast tone="success" message={state.message} />}
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>
      <div>
        <Label htmlFor="body">Message</Label>
        <Textarea id="body" name="body" rows={4} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="audience">Audience</Label>
          <Select id="audience" name="audience" defaultValue="all">
            <option value="all">All members</option>
            <option value="active_subscribers">Active subscribers only</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="eventType">Event type</Label>
          <Input id="eventType" name="eventType" defaultValue="MANUAL_BROADCAST" />
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Delivery channels</legend>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="channels" value="DASHBOARD" defaultChecked />
          Dashboard notification
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="channels" value="EMAIL" />
          Email
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="channels" value="TELEGRAM" />
          Telegram channel
        </label>
      </fieldset>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send broadcast"}
      </Button>
    </form>
  );
}
