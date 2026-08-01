"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { createVideoTestimonialAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = { status: "idle", message: "" };

export function VideoTestimonialForm() {
  const [state, formAction, pending] = useActionState(createVideoTestimonialAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && <InlineToast tone="success" message={state.message} />}

      <div>
        <Label htmlFor="video-url">Video link</Label>
        <Input
          id="video-url"
          name="sourceUrl"
          type="url"
          placeholder="https://youtube.com/shorts/… or https://instagram.com/reel/…"
          required
        />
        <p className="mt-1 text-xs text-muted">YouTube (incl. Shorts) or Instagram reel/post links.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Label htmlFor="video-name">Member name</Label>
          <Input id="video-name" name="authorName" placeholder="e.g. R. Sharma" required />
        </div>
        <div className="sm:col-span-1">
          <Label htmlFor="video-role">Context (optional)</Label>
          <Input id="video-role" name="authorRole" placeholder="e.g. Member since 2025" />
        </div>
        <div className="sm:col-span-1">
          <Label htmlFor="video-order">Display order</Label>
          <Input id="video-order" name="sortOrder" type="number" min="0" defaultValue={0} />
        </div>
      </div>

      <p className="text-xs text-muted">
        Compliance: only publish reels about the <strong>service experience</strong> — no returns,
        P&amp;L or performance claims.
      </p>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" name="isPublished" defaultChecked />
        Publish to the home page now
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add video reel"}
      </Button>
    </form>
  );
}
