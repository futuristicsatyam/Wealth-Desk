"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { createOutlookAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = { status: "idle", message: "" };

export function OutlookForm({ analysts }: { analysts: Array<{ id: string; name: string }> }) {
  const [state, formAction, pending] = useActionState(createOutlookAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && <InlineToast tone="success" message={state.message} />}
      <div>
        <Label htmlFor="analystId">Analyst (optional)</Label>
        <Select id="analystId" name="analystId" defaultValue="">
          <option value="">Unattributed</option>
          {analysts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="nifty">Nifty 50 view</Label>
          <Input id="nifty" name="nifty" placeholder="e.g. Bullish above 22400" required />
        </div>
        <div>
          <Label htmlFor="bankNifty">Bank Nifty view</Label>
          <Input id="bankNifty" name="bankNifty" placeholder="e.g. Range-bound" required />
        </div>
        <div>
          <Label htmlFor="volatility">Volatility</Label>
          <Input id="volatility" name="volatility" placeholder="e.g. India VIX ~13" required />
        </div>
      </div>
      <div>
        <Label htmlFor="globalCues">Global cues</Label>
        <Textarea id="globalCues" name="globalCues" rows={2} required />
      </div>
      <div>
        <Label htmlFor="sectorStrength">Sector strength</Label>
        <Textarea id="sectorStrength" name="sectorStrength" rows={2} required />
      </div>
      <div>
        <Label htmlFor="institutionalSentiment">Institutional sentiment</Label>
        <Textarea id="institutionalSentiment" name="institutionalSentiment" rows={2} required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Publishing..." : "Publish outlook"}
      </Button>
    </form>
  );
}
