import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ComplianceBanner } from "@/components/compliance-banner";
import { APP_URL } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Wealth Research Desk | Institutional-Grade F&O Research",
    template: "%s | Wealth Research Desk"
  },
  description:
    "Premium Indian market research platform delivering risk-managed F&O and equity setups from SEBI-registered analysts.",
  applicationName: "Wealth Research Desk",
  openGraph: {
    title: "Wealth Research Desk",
    description: "Institutional-grade research, market outlooks and risk-managed trade intelligence.",
    type: "website",
    url: APP_URL
  },
  twitter: { card: "summary_large_image", title: "Wealth Research Desk" },
  robots: { index: true, follow: true }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Per-request CSP nonce issued by middleware. Passed to next-themes so its
  // pre-hydration inline script carries the nonce under the strict CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider nonce={nonce}>
          <ComplianceBanner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
