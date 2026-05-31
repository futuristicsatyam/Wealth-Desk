import type { Metadata } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ComplianceBanner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
