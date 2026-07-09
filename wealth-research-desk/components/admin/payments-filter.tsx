"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";

/** Navigates to ?plan=<code> so the server component can filter payments by plan. */
export function PaymentsFilter({
  plans,
  current
}: {
  plans: { code: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value) next.delete("plan");
    else next.set("plan", value);
    const qs = next.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  return (
    <div className={pending ? "opacity-60" : ""}>
      <Select
        aria-label="Filter by plan"
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-48"
      >
        <option value="">All plans</option>
        {plans.map((p) => (
          <option key={p.code} value={p.code}>
            {p.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
