"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS: Array<[string, string]> = [
  ["Home", "/"],
  ["About", "/about"],
  ["Membership", "/membership"],
  ["Performance", "/performance"],
  ["FAQ", "/faq"],
  ["Contact", "/contact"]
];

export function PublicNavbar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const profileHref = isAuthenticated ? "/dashboard" : "/login";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-gradient">
          WEALTH RESEARCH DESK
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "text-sm transition hover:text-foreground",
                pathname === href ? "text-foreground" : "text-muted"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href={profileHref} className="hidden sm:block">
            <Button size="sm">{isAuthenticated ? "Dashboard" : "Sign in"}</Button>
          </Link>
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-muted md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-surface md:hidden">
          <nav className="container-page flex flex-col gap-1 py-3">
            {NAV_LINKS.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm",
                  pathname === href ? "bg-card text-foreground" : "text-muted"
                )}
              >
                {label}
              </Link>
            ))}
            <Link
              href={profileHref}
              onClick={() => setOpen(false)}
              className="mt-1 rounded-lg bg-accent px-3 py-2.5 text-center text-sm font-medium text-background"
            >
              {isAuthenticated ? "Open dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
