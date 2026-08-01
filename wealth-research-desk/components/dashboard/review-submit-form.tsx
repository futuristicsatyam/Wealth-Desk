"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineToast } from "@/components/ui/inline-toast";
import { submitReviewAction, type ActionState } from "@/app/dashboard/actions";

const initialState: ActionState = { status: "idle", message: "" };

type ExistingReview = {
  quote: string;
  authorRole: string | null;
  rating: number | null;
  isPublished: boolean;
};

export function ReviewSubmitForm({ existing }: { existing: ExistingReview | null }) {
  const [state, formAction, pending] = useActionState(submitReviewAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {existing && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>Your review is</span>
          <Badge tone={existing.isPublished ? "success" : "neutral"}>
            {existing.isPublished ? "Published" : "Pending review"}
          </Badge>
        </div>
      )}

      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && <InlineToast tone="success" message={state.message} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="review-rating">Rate the service (optional)</Label>
          <Select id="review-rating" name="rating" defaultValue={existing?.rating?.toString() ?? ""}>
            <option value="">No rating</option>
            <option value="5">★★★★★ (5)</option>
            <option value="4">★★★★ (4)</option>
            <option value="3">★★★ (3)</option>
            <option value="2">★★ (2)</option>
            <option value="1">★ (1)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="review-role">A bit about you (optional)</Label>
          <Input
            id="review-role"
            name="authorRole"
            defaultValue={existing?.authorRole ?? ""}
            placeholder="e.g. Options trader, member since 2025"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="review-quote">Your feedback</Label>
        <Textarea
          id="review-quote"
          name="quote"
          rows={4}
          defaultValue={existing?.quote ?? ""}
          placeholder="Tell us about your experience of the research — the discipline, clarity, risk framework. Please don't mention returns or profits."
          required
        />
        <p className="mt-1 text-xs text-muted">
          Shared under your account name. Keep it about the service experience — reviews mentioning
          returns/profits can&apos;t be published (SEBI rules). Submissions are reviewed before they
          go live.
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : existing ? "Update my review" : "Submit review"}
      </Button>
    </form>
  );
}
