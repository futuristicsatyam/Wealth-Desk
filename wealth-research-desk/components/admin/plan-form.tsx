"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { createPlanAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = { status: "idle", message: "" };

export function PlanForm() {
  const [state, formAction, pending] = useActionState(createPlanAction, initialState);
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
          <Label htmlFor="code">Plan code (unique)</Label>
          <Input id="code" name="code" placeholder="QUARTERLY" required />
        </div>
        <div>
          <Label htmlFor="name">Display name</Label>
          <Input id="name" name="name" placeholder="Quarterly Membership" required />
        </div>
        <div>
          <Label htmlFor="planType">Plan type</Label>
          <Select id="planType" name="planType" defaultValue="MONTHLY" required>
            <option value="TRIAL">Trial</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ANNUAL">Annual</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="amountRupees">Amount (INR)</Label>
          <Input id="amountRupees" name="amountRupees" type="number" min="0" step="1" required />
        </div>
        <div>
          <Label htmlFor="durationDays">Duration (days)</Label>
          <Input id="durationDays" name="durationDays" type="number" min="1" required />
        </div>
        <div>
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input id="sortOrder" name="sortOrder" type="number" defaultValue="0" />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder="Short tagline" />
      </div>
      <div>
        <Label htmlFor="features">Features (one per line)</Label>
        <Textarea id="features" name="features" rows={4} placeholder={"Daily trades\nMarket outlook\nPriority support"} required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create plan"}
      </Button>
    </form>
  );
}
