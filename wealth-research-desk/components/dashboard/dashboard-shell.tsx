"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  TrendingUp,
  Compass,
  History,
  Bell,
  CreditCard,
  Wallet,
  LifeBuoy,
  Shield,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  trades: TrendingUp,
  outlook: Compass,
  history: History,
  notifications: Bell,
  subscription: CreditCard,
  billing: Wallet,
  support: LifeBuoy,
  admin: Shield
} as const;

export type NavItem = { label: string; href: string; icon: keyof typeof ICONS };

export function DashboardShell({
  navItems,
  user,
  unreadCount,
  children
}: {
  navItems: NavItem[];
  user: { name: string; email: string; role: string };
  unreadCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <Link href="/" className="text-sm font-semibold tracking-[0.16em] text-gradient">
          WEALTH RESEARCH DESK
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition",
                active ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon size={18} />
                {item.label}
              </span>
              {item.href === "/dashboard/notifications" && unreadCount > 0 && (
                <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold text-background">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 border-t border-border p-3">
        <div className="px-2">
          <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface hover:text-negative"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:block">
        {SidebarContent}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-border bg-surface">
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:px-8">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border lg:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <p className="text-sm text-muted">
            Signed in as <span className="text-foreground">{user.role}</span>
          </p>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
