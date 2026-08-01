"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineToast } from "@/components/ui/inline-toast";
import { submitVideoTestimonialAction, type ActionState } from "@/app/dashboard/actions";

const initialState: ActionState = { status: "idle", message: "" };

type ExistingVideo = {
  sourceUrl: string;
  authorRole: string | null;
  provider: "YOUTUBE" | "INSTAGRAM";
  isPublished: boolean;
};

export function VideoSubmitForm({ existing }: { existing: ExistingVideo | null }) {
  const [state, formAction, pending] = useActionState(submitVideoTestimonialAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {existing && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>Your video reel is</span>
          <Badge tone={existing.isPublished ? "success" : "neutral"}>
            {existing.isPublished ? "Published" : "Pending review"}
          </Badge>
        </div>
      )}

      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && <InlineToast tone="success" message={state.message} />}

      <div>
        <Label htmlFor="video-url">Video link (YouTube or Instagram)</Label>
        <Input
          id="video-url"
          name="sourceUrl"
          type="url"
          defaultValue={existing?.sourceUrl ?? ""}
          placeholder="https://youtube.com/shorts/… or https://instagram.com/reel/…"
          required
        />
        <p className="mt-1 text-xs text-muted">
          Paste a public YouTube (incl. Shorts) or Instagram reel link. Please keep it about the
          service experience — reels mentioning returns/profits can&apos;t be published (SEBI rules).
        </p>
      </div>

      <div>
        <Label htmlFor="video-role">A bit about you (optional)</Label>
        <Input
          id="video-role"
          name="authorRole"
          defaultValue={existing?.authorRole ?? ""}
          placeholder="e.g. Options trader, member since 2025"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : existing ? "Update my video reel" : "Submit video reel"}
      </Button>
    </form>
  );
}
