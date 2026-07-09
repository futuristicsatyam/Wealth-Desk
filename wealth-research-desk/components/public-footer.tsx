import Link from "next/link";

const RESOURCE_LINKS: Array<[string, string]> = [
  ["About", "/about"],
  ["Membership", "/membership"],
  ["Performance", "/performance"],
  ["FAQ", "/faq"],
  ["Contact", "/contact"]
];

const LEGAL_LINKS: Array<[string, string]> = [
  ["Disclaimer", "/legal/disclaimer"],
  ["Privacy Policy", "/legal/privacy"],
  ["Terms & Conditions", "/legal/terms"],
  ["Refund Policy", "/legal/refund"]
];

export function PublicFooter() {
  // const sebi = process.env.SEBI_REGISTRATION || "INH000000000";
  // const gstin = process.env.GSTIN || "27AAAAA0000A1Z5";

  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="text-sm font-semibold tracking-[0.16em] text-gradient">WEALTH RESEARCH DESK</p>
          <p className="text-xs leading-relaxed text-muted">
            Institutional-grade Indian market research and risk-managed trade intelligence for
            independent participants.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Platform</p>
          <ul className="mt-3 space-y-2">
            {RESOURCE_LINKS.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="text-sm text-muted hover:text-foreground">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Legal</p>
          <ul className="mt-3 space-y-2">
            {LEGAL_LINKS.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="text-sm text-muted hover:text-foreground">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2 text-xs text-muted">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Compliance</p>
          {/* <p>SEBI Research Analyst Reg. No: {sebi}</p>
          <p>GSTIN: {gstin}</p> */}
          <p>We publish research only. We do not execute trades or manage funds.</p>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page py-5 text-center text-xs text-muted">
          Investments in securities markets are subject to risk. Past performance is not indicative of
          future results. &copy; {new Date().getFullYear()} Wealth Research Desk.
        </div>
      </div>
    </footer>
  );
}
