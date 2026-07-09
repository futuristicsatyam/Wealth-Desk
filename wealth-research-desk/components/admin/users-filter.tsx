"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/**
 * Search + filter bar for the admin users list. Reflects state into the URL
 * (?q / ?role / ?status / ?sub) so the server component does the filtering.
 */
export function UsersFilter({
  q,
  role,
  status,
  sub
}: {
  q: string;
  role: string;
  status: string;
  sub: string;
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
          aria-label="Search users by name or email"
          placeholder="Search name or email..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="h-9 w-full pl-8 sm:w-60"
        />
      </div>
      <Select
        aria-label="Filter by role"
        value={role}
        onChange={(e) => setParam("role", e.target.value)}
        className="h-9 w-32"
      >
        <option value="">All roles</option>
        <option value="USER">User</option>
        <option value="ANALYST">Analyst</option>
        <option value="ADMIN">Admin</option>
      </Select>
      <Select
        aria-label="Filter by account status"
        value={status}
        onChange={(e) => setParam("status", e.target.value)}
        className="h-9 w-36"
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </Select>
      <Select
        aria-label="Filter by subscription"
        value={sub}
        onChange={(e) => setParam("sub", e.target.value)}
        className="h-9 w-40"
      >
        <option value="">All members</option>
        <option value="subscribed">Subscribed</option>
        <option value="free">Free</option>
      </Select>
    </div>
  );
}
