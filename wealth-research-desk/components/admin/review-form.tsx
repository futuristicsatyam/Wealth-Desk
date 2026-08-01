"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { createReviewAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = { status: "idle", message: "" };

export function ReviewForm() {
  const [state, formAction, pending] = useActionState(createReviewAction, initialState);
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
          <Label htmlFor="review-name">Member name</Label>
          <Input id="review-name" name="authorName" placeholder="e.g. R. Sharma" required />
        </div>
        <div>
          <Label htmlFor="review-role">Context (optional)</Label>
          <Input id="review-role" name="authorRole" placeholder="e.g. Member since 2025" />
          <p className="mt-1 text-xs text-muted">Neutral context only — never returns/profit claims.</p>
        </div>
        <div>
          <Label htmlFor="review-rating">Service rating (optional)</Label>
          <Select id="review-rating" name="rating" defaultValue="">
            <option value="">No rating</option>
            <option value="5">★★★★★ (5)</option>
            <option value="4">★★★★ (4)</option>
            <option value="3">★★★ (3)</option>
            <option value="2">★★ (2)</option>
            <option value="1">★ (1)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="review-order">Display order</Label>
          <Input id="review-order" name="sortOrder" type="number" min="0" defaultValue={0} />
          <p className="mt-1 text-xs text-muted">Lower shows first.</p>
        </div>
      </div>

      <div>
        <Label htmlFor="review-quote">Feedback</Label>
        <Textarea
          id="review-quote"
          name="quote"
          rows={3}
          placeholder="Their experience of the service — the research, discipline, clarity. No mention of returns, profit or performance."
          required
        />
        <p className="mt-1 text-xs text-muted">
          Compliance: keep it about the <strong>service experience</strong>. Do not include returns,
          P&amp;L, or performance claims.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" name="isPublished" defaultChecked />
        Publish to the home page now
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add review"}
      </Button>
    </form>
  );
}
