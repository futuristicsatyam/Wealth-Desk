"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { createPlanAction, updatePlanAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = { status: "idle", message: "" };

export type EditablePlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  amountPaise: number;
  durationDays: number;
  referralBonusDays: number;
  telegramAlerts: boolean;
  isTrial: boolean;
  isActive: boolean;
  features: string[];
  sortOrder: number;
  isPrivate: boolean;
  maxRedemptions: number | null;
};

/** Derives the plan-type select value from stored fields. */
function planTypeOf(plan: EditablePlan): string {
  if (plan.isTrial) return "TRIAL";
  if (plan.durationDays <= 31) return "MONTHLY";
  if (plan.durationDays <= 120) return "QUARTERLY";
  return "ANNUAL";
}

export function PlanForm({ plan }: { plan?: EditablePlan }) {
  const isEdit = Boolean(plan);
  const [state, formAction, pending] = useActionState(
    isEdit ? updatePlanAction : createPlanAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [isPrivate, setIsPrivate] = useState(plan?.isPrivate ?? false);

  useEffect(() => {
    // Only clear the "create" form on success; keep edited values in place.
    if (state.status === "success" && !isEdit) formRef.current?.reset();
  }, [state.status, isEdit]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && <InlineToast tone="success" message={state.message} />}

      {plan && <input type="hidden" name="planId" value={plan.id} />}
      {/* Preserve current visibility; the Show/Hide toggle controls isActive. */}
      {plan && <input type="hidden" name="isActive" value={plan.isActive ? "true" : "false"} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`code-${plan?.id ?? "new"}`}>Plan code (unique)</Label>
          <Input
            id={`code-${plan?.id ?? "new"}`}
            name="code"
            placeholder="QUARTERLY"
            defaultValue={plan?.code}
            required
          />
        </div>
        <div>
          <Label htmlFor={`name-${plan?.id ?? "new"}`}>Display name</Label>
          <Input
            id={`name-${plan?.id ?? "new"}`}
            name="name"
            placeholder="Quarterly Membership"
            defaultValue={plan?.name}
            required
          />
        </div>
        <div>
          <Label htmlFor={`planType-${plan?.id ?? "new"}`}>Plan type</Label>
          <Select
            id={`planType-${plan?.id ?? "new"}`}
            name="planType"
            defaultValue={plan ? planTypeOf(plan) : "MONTHLY"}
            required
          >
            <option value="TRIAL">Trial</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ANNUAL">Annual</option>
          </Select>
        </div>
        <div>
          <Label htmlFor={`amountRupees-${plan?.id ?? "new"}`}>Amount (INR)</Label>
          <Input
            id={`amountRupees-${plan?.id ?? "new"}`}
            name="amountRupees"
            type="number"
            min="0"
            step="1"
            defaultValue={plan ? Math.round(plan.amountPaise / 100) : undefined}
            required
          />
        </div>
        <div>
          <Label htmlFor={`durationDays-${plan?.id ?? "new"}`}>Duration (days)</Label>
          <Input
            id={`durationDays-${plan?.id ?? "new"}`}
            name="durationDays"
            type="number"
            min="1"
            defaultValue={plan?.durationDays}
            required
          />
        </div>
        <div>
          <Label htmlFor={`sortOrder-${plan?.id ?? "new"}`}>Sort order</Label>
          <Input
            id={`sortOrder-${plan?.id ?? "new"}`}
            name="sortOrder"
            type="number"
            defaultValue={plan?.sortOrder ?? 0}
          />
        </div>
        <div>
          <Label htmlFor={`referralBonusDays-${plan?.id ?? "new"}`}>Referral bonus (days)</Label>
          <Input
            id={`referralBonusDays-${plan?.id ?? "new"}`}
            name="referralBonusDays"
            type="number"
            min="0"
            placeholder="0"
            defaultValue={plan?.referralBonusDays ?? 0}
          />
          <p className="mt-1 text-xs text-muted">
            Free days a referrer earns when someone buys this plan. 0 = no reward.
          </p>
        </div>
      </div>
      <div>
        <Label htmlFor={`description-${plan?.id ?? "new"}`}>Description</Label>
        <Input
          id={`description-${plan?.id ?? "new"}`}
          name="description"
          placeholder="Short tagline"
          defaultValue={plan?.description ?? ""}
        />
      </div>
      <div>
        <Label htmlFor={`features-${plan?.id ?? "new"}`}>Features (one per line)</Label>
        <Textarea
          id={`features-${plan?.id ?? "new"}`}
          name="features"
          rows={4}
          placeholder={"Daily trades\nMarket outlook\nPriority support"}
          defaultValue={plan?.features.join("\n")}
          required
        />
      </div>

      {/* Special perk: Telegram trade alerts */}
      <div className="rounded-lg border border-border bg-surface p-3">
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="telegramAlerts"
            value="true"
            defaultChecked={plan?.telegramAlerts ?? false}
            className="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]"
          />
          <span>
            <span className="font-medium">Telegram trade alerts</span>
            <span className="mt-0.5 block text-xs text-muted">
              Members on this plan get new-trade alerts as Telegram DMs (a special perk). Every active
              member still receives the in-dashboard notification regardless of this setting.
            </span>
          </span>
        </label>
      </div>

      {/* Private / special plan controls */}
      <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="isPrivate"
            value="true"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]"
          />
          <span>
            <span className="font-medium">Private / special plan</span>
            <span className="mt-0.5 block text-xs text-muted">
              Hidden from public pricing. Reachable only via a secret access link. Set the amount to 0
              for a free complimentary plan (members activate instantly, no payment).
            </span>
          </span>
        </label>

        {isPrivate && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`maxRedemptions-${plan?.id ?? "new"}`}>Member limit (optional)</Label>
              <Input
                id={`maxRedemptions-${plan?.id ?? "new"}`}
                name="maxRedemptions"
                type="number"
                min="1"
                placeholder="Unlimited"
                defaultValue={plan?.maxRedemptions ?? undefined}
              />
            </div>
            {isEdit && (
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input type="checkbox" name="regenerateToken" value="true" className="h-4 w-4 accent-[rgb(var(--accent))]" />
                <span>
                  Regenerate link
                  <span className="block text-xs text-muted">Invalidates the old link</span>
                </span>
              </label>
            )}
          </div>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save changes" : "Create plan"}
      </Button>
    </form>
  );
}
