"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineToast } from "@/components/ui/inline-toast";
import { createCouponAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = { status: "idle", message: "" };

export function CouponForm({ planCodes }: { planCodes: string[] }) {
  const [state, formAction, pending] = useActionState(createCouponAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">("PERCENT");

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.status === "error" && <InlineToast tone="error" message={state.message} />}
      {state.status === "success" && <InlineToast tone="success" message={state.message} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="coupon-code">Coupon code</Label>
          <Input id="coupon-code" name="code" placeholder="WELCOME20" required />
          <p className="mt-1 text-xs text-muted">3–24 chars: A–Z, 0–9, - or _. Shown uppercase.</p>
        </div>
        <div>
          <Label htmlFor="coupon-desc">Description (optional)</Label>
          <Input id="coupon-desc" name="description" placeholder="Launch offer" />
        </div>
        <div>
          <Label htmlFor="coupon-type">Discount type</Label>
          <Select
            id="coupon-type"
            name="discountType"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "FLAT")}
          >
            <option value="PERCENT">Percentage (%)</option>
            <option value="FLAT">Flat amount (₹)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="coupon-value">
            {discountType === "PERCENT" ? "Discount percent (1–100)" : "Discount amount (₹)"}
          </Label>
          <Input
            id="coupon-value"
            name="discountValue"
            type="number"
            min="1"
            max={discountType === "PERCENT" ? "100" : undefined}
            placeholder={discountType === "PERCENT" ? "20" : "500"}
            required
          />
        </div>
        <div>
          <Label htmlFor="coupon-max">Total uses (optional)</Label>
          <Input id="coupon-max" name="maxRedemptions" type="number" min="1" placeholder="Unlimited" />
          <p className="mt-1 text-xs text-muted">Cap across all members. Blank = unlimited.</p>
        </div>
        <div>
          <Label htmlFor="coupon-peruser">Uses per member</Label>
          <Input id="coupon-peruser" name="perUserLimit" type="number" min="1" defaultValue={1} />
        </div>
        <div>
          <Label htmlFor="coupon-min">Minimum order (₹, optional)</Label>
          <Input id="coupon-min" name="minAmountRupees" type="number" min="0" placeholder="0" />
        </div>
        <div>
          <Label htmlFor="coupon-expiry">Expires on (optional)</Label>
          <Input id="coupon-expiry" name="expiresAt" type="date" />
        </div>
      </div>

      <div>
        <Label htmlFor="coupon-plans">Restrict to plans (optional)</Label>
        <Input id="coupon-plans" name="planCodes" placeholder="MONTHLY, QUARTERLY" />
        <p className="mt-1 text-xs text-muted">
          Comma-separated plan codes. Leave blank to apply to every paid plan.
          {planCodes.length > 0 && <> Available: {planCodes.join(", ")}.</>}
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create coupon"}
      </Button>
    </form>
  );
}
