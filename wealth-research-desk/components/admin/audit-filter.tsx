"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/**
 * Search + filter bar for the admin audit log. Reflects state into the URL
 * (?q / ?action / ?from / ?to) so the server component does the filtering.
 * The action list is passed in from the DB so it never drifts out of date.
 */
export function AuditFilter({
  q,
  action,
  from,
  to,
  actions
}: {
  q: string;
  action: string;
  from: string;
  to: string;
  /** Distinct action names present in the audit log. */
  actions: string[];
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
          aria-label="Search audit log by summary, actor, entity or IP"
          placeholder="Search events..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="h-9 w-full pl-8 sm:w-56"
        />
      </div>
      <Select
        aria-label="Filter by action"
        value={action}
        onChange={(e) => setParam("action", e.target.value)}
        className="h-9 w-48"
      >
        <option value="">All actions</option>
        {actions.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </Select>
      <label className="flex items-center gap-1 text-xs text-muted">
        From
        <Input
          type="date"
          aria-label="From date"
          value={from}
          max={to || undefined}
          onChange={(e) => setParam("from", e.target.value)}
          className="h-9 w-40"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-muted">
        To
        <Input
          type="date"
          aria-label="To date"
          value={to}
          min={from || undefined}
          onChange={(e) => setParam("to", e.target.value)}
          className="h-9 w-40"
        />
      </label>
    </div>
  );
}
