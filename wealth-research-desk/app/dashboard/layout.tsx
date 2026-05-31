import { DashboardShell, type NavItem } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const BASE_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: "dashboard" },
  { label: "Trades", href: "/dashboard/trades", icon: "trades" },
  { label: "Market Outlook", href: "/dashboard/outlook", icon: "outlook" },
  { label: "Trade History", href: "/dashboard/history", icon: "history" },
  { label: "Notifications", href: "/dashboard/notifications", icon: "notifications" },
  { label: "Subscription", href: "/dashboard/subscription", icon: "subscription" },
  { label: "Billing", href: "/dashboard/billing", icon: "billing" },
  { label: "Support", href: "/dashboard/support", icon: "support" }
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false }
  });

  const navItems: NavItem[] =
    user.role === "ADMIN"
      ? [...BASE_NAV, { label: "Admin Console", href: "/admin", icon: "admin" }]
      : BASE_NAV;

  return (
    <DashboardShell
      navItems={navItems}
      user={{ name: user.name, email: user.email, role: user.role }}
      unreadCount={unreadCount}
    >
      {children}
    </DashboardShell>
  );
}
