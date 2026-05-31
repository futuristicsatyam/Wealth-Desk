import { PublicNavbar } from "@/components/public-navbar";
import { PublicFooter } from "@/components/public-footer";
import { getCurrentUser } from "@/lib/session";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar isAuthenticated={Boolean(user)} />
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </div>
  );
}
