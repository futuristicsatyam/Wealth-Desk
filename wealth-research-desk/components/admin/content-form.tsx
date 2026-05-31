"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { updateManagedContentAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = { status: "idle", message: "" };

export function ContentForm({
  slug,
  defaultTitle,
  defaultBody
}: {
  slug: string;
  defaultTitle: string;
  defaultBody: string;
}) {
  const [state, formAction, pending] = useActionState(updateManagedContentAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && <InlineToast tone="success" message={state.message} />}
      <input type="hidden" name="slug" value={slug} />
      <div>
        <Label htmlFor={`title-${slug}`}>Title</Label>
        <Input id={`title-${slug}`} name="title" defaultValue={defaultTitle} required />
      </div>
      <div>
        <Label htmlFor={`body-${slug}`}>Body</Label>
        <Textarea id={`body-${slug}`} name="body" rows={8} defaultValue={defaultBody} required />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving..." : "Save content"}
      </Button>
    </form>
  );
}
