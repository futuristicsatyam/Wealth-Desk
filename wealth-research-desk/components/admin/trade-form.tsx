"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { createTradeAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = { status: "idle", message: "" };

type AnalystOption = { id: string; name: string };
type IndexOption = { id: string; name: string; lotSize: number };

export function TradeForm({
  analysts,
  indexes
}: {
  analysts: AnalystOption[];
  indexes: IndexOption[];
}) {
  const [state, formAction, pending] = useActionState(createTradeAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  if (analysts.length === 0) {
    return (
      <InlineToast
        tone="error"
        message="Add an active analyst before publishing trades - trades must be attributed correctly."
      />
    );
  }

  if (indexes.length === 0) {
    return <InlineToast tone="error" message="Add at least one index before publishing trades." />;
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && <InlineToast tone="success" message={state.message} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="analystId">Attributed analyst</Label>
          <Select id="analystId" name="analystId" required>
            {analysts.map((analyst) => (
              <option key={analyst.id} value={analyst.id}>
                {analyst.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="tradeType">Direction</Label>
          <Select id="tradeType" name="tradeType" defaultValue="BUY" required>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="indexId">Index</Label>
          <Select id="indexId" name="indexId" required>
            {indexes.map((index) => (
              <option key={index.id} value={index.id}>
                {index.name} (Lot {index.lotSize})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="instrument">Instrument</Label>
          <Input id="instrument" name="instrument" placeholder="e.g. NIFTY 22500 CE" required />
        </div>
        <div>
          <Label htmlFor="segment">Segment</Label>
          <Input id="segment" name="segment" placeholder="e.g. Index Options" required />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="entryPrice">Entry price</Label>
          <Input id="entryPrice" name="entryPrice" type="number" step="0.01" min="0" required />
        </div>
        <div>
          <Label htmlFor="stopLoss">Stop loss</Label>
          <Input id="stopLoss" name="stopLoss" type="number" step="0.01" min="0" required />
        </div>
        <div>
          <Label htmlFor="riskRating">Risk rating (1-5)</Label>
          <Input id="riskRating" name="riskRating" type="number" min="1" max="5" defaultValue="3" required />
        </div>
        <div>
          <Label htmlFor="target1">Target 1</Label>
          <Input id="target1" name="target1" type="number" step="0.01" min="0" required />
        </div>
        <div>
          <Label htmlFor="target2">Target 2</Label>
          <Input id="target2" name="target2" type="number" step="0.01" min="0" required />
        </div>
        <div>
          <Label htmlFor="target3">Target 3 (optional)</Label>
          <Input id="target3" name="target3" type="number" step="0.01" min="0" />
        </div>
      </div>

      <div>
        <Label htmlFor="rationale">Rationale</Label>
        <Textarea id="rationale" name="rationale" rows={3} placeholder="Why this setup?" required />
      </div>
      <div>
        <Label htmlFor="chartImageUrl">Chart image URL (optional)</Label>
        <Input id="chartImageUrl" name="chartImageUrl" type="url" placeholder="https://..." />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" name="isTrialVisible" />
        Visible to trial members
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Publishing..." : "Publish trade"}
      </Button>
    </form>
  );
}
