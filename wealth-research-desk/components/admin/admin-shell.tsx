"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Compass,
  Users,
  UserCog,
  CreditCard,
  Wallet,
  Receipt,
  Megaphone,
  FileText,
  ScrollText,
  Menu,
  ArrowLeft
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  trades: TrendingUp,
  outlooks: Compass,
  analysts: UserCog,
  users: Users,
  plans: CreditCard,
  subscriptions: Wallet,
  payments: Receipt,
  trials: TrendingUp,
  notifications: Megaphone,
  content: FileText,
  audit: ScrollText
} as const;

const NAV: Array<{ label: string; href: string; icon: keyof typeof ICONS }> = [
  { label: "Overview", href: "/admin", icon: "dashboard" },
  { label: "Trades", href: "/admin/trades", icon: "trades" },
  { label: "Market Outlooks", href: "/admin/outlooks", icon: "outlooks" },
  { label: "Analysts", href: "/admin/analysts", icon: "analysts" },
  { label: "Users", href: "/admin/users", icon: "users" },
  { label: "Plans", href: "/admin/plans", icon: "plans" },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: "subscriptions" },
  { label: "Payments", href: "/admin/payments", icon: "payments" },
  { label: "Trials", href: "/admin/trials", icon: "trials" },
  { label: "Broadcasts", href: "/admin/notifications", icon: "notifications" },
  { label: "Content", href: "/admin/content", icon: "content" },
  { label: "Audit Log", href: "/admin/audit", icon: "audit" }
];

export function AdminShell({
  adminName,
  children
}: {
  adminName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const Sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <p className="text-xs font-semibold tracking-[0.16em] text-accent">ADMIN CONSOLE</p>
        <p className="mt-0.5 text-sm font-medium">{adminName}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 scrollbar-thin">
        {NAV.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                active ? "bg-accent/15 text-accent" : "text-muted hover:bg-card hover:text-foreground"
              )}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Member dashboard
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:block">{Sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-border bg-surface">
            {Sidebar}
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
            <Menu size={18} />
          </button>
          <p className="text-sm text-muted">Administrator</p>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
