"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/**
 * Search + filter bar for the admin subscriptions list. Reflects state into the
 * URL (?q / ?status / ?plan) so the server component does the filtering.
 */
export function SubscriptionsFilter({
  q,
  status,
  plan,
  plans
}: {
  q: string;
  status: string;
  plan: string;
  /** Actual configured plans (code + name), so new plans appear automatically. */
  plans: { code: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(q);
  const mounted = useRef(false);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  // Debounce the free-text search into the ?q param.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const t = setTimeout(() => setParam("q", term.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${pending ? "opacity-60" : ""}`}>
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <Input
          aria-label="Search subscriptions by customer name or email"
          placeholder="Search customer..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="h-9 w-full pl-8 sm:w-60"
        />
      </div>
      <Select
        aria-label="Filter by status"
        value={status}
        onChange={(e) => setParam("status", e.target.value)}
        className="h-9 w-36"
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="expired">Expired</option>
        <option value="cancelled">Cancelled</option>
        <option value="pending">Pending</option>
      </Select>
      <Select
        aria-label="Filter by plan"
        value={plan}
        onChange={(e) => setParam("plan", e.target.value)}
        className="h-9 w-44"
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
