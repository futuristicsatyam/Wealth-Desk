/** Public legal pages. Bodies can be overridden by ManagedContent in the DB. */
export type LegalSlug = "disclaimer" | "privacy" | "terms" | "refund";

type LegalDoc = { slug: LegalSlug; title: string; body: string };

export const LEGAL_TITLES: Record<LegalSlug, string> = {
  disclaimer: "Market Risk Disclosure & Disclaimer",
  privacy: "Privacy Policy",
  terms: "Terms & Conditions",
  refund: "Refund & Cancellation Policy"
};

export const LEGAL_SLUGS = Object.keys(LEGAL_TITLES) as LegalSlug[];

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as string[]).includes(value);
}

/**
 * Builds the default legal documents. The trial duration is injected so the
 * Terms copy stays in sync with the configured trial plan. Pass the value from
 * `getTrialPlanInfo().days`.
 */
export function buildLegalDocs(trialDays: number): Record<LegalSlug, LegalDoc> {
  return {
  disclaimer: {
    slug: "disclaimer",
    title: LEGAL_TITLES.disclaimer,
    body: [
      "Investments in securities markets are subject to market risks. Trading in leveraged products such as Futures & Options can result in losses that exceed the initial capital deployed.",
      "Wealth Research Desk publishes research, analysis and educational trade ideas prepared by SEBI-registered research analysts. We do NOT execute trades on behalf of members, manage client funds, or provide portfolio management services.",
      "No content on this platform should be interpreted as a guarantee, assurance or projection of profit. Past performance is not indicative of future results. Members must take independent decisions in their own broker accounts and should consult a qualified financial adviser where appropriate.",
      "Performance information, where shown, is presented for transparency in points or outcomes and does not represent realised returns on any specific capital base."
    ].join("\n\n")
  },
  privacy: {
    slug: "privacy",
    title: LEGAL_TITLES.privacy,
    body: [
      "We collect the information required to operate a compliant research subscription service: your name, email, mobile number, and KYC identifiers (PAN and Aadhaar).",
      "KYC identifiers are stored to satisfy regulatory and trial-eligibility requirements and are never displayed in full within the product. Payment processing is handled by Razorpay; we do not store card or bank credentials.",
      "We use your contact details only to deliver research, account, billing and service notifications. You may request access to or deletion of your personal data by contacting support, subject to applicable record-keeping obligations.",
      "We do not sell personal data to third parties.",
      "Cookies: We use strictly-necessary cookies only - a secure, HttpOnly session cookie to keep you signed in, and a small cookie that remembers your cookie-consent choice. These are essential to operate the service and cannot be switched off. We do not use advertising, cross-site tracking, or third-party analytics cookies. If we introduce any non-essential cookies in future, they will be loaded only after you opt in via the consent banner, and you can withdraw consent at any time by clearing the cookie or contacting support.",
      "This policy is provided in line with India's Digital Personal Data Protection Act, 2023. For visitors in other jurisdictions (e.g. the EU/UK), the same consent-first approach applies."
    ].join("\n\n")
  },
  terms: {
    slug: "terms",
    title: LEGAL_TITLES.terms,
    body: [
      "By creating an account you agree to use Wealth Research Desk for personal, non-commercial research purposes only. Membership is individual and non-transferable.",
      "Research content is the intellectual property of Wealth Research Desk. Redistribution, resale or public sharing of trade ideas, outlooks or alerts is prohibited.",
      `Subscriptions are time-bound and renew only when you initiate a new payment unless an explicit auto-renewal is configured. The one-time ${trialDays}-day trial is available once per verified user.`,
      "We may suspend accounts that violate these terms or applicable regulations."
    ].join("\n\n")
  },
  refund: {
    slug: "refund",
    title: LEGAL_TITLES.refund,
    body: [
      "Because research content is delivered digitally and immediately upon subscription activation, subscription fees are generally non-refundable once access has begun.",
      "If a payment is deducted but access is not granted due to a technical error, the full amount will be refunded to the original payment method within 7-10 working days after verification.",
      "You may cancel auto-renewal at any time from your billing page; cancellation stops future charges and does not shorten the current paid period.",
      "For any billing dispute, contact support with your invoice number within 7 days of the transaction."
    ].join("\n\n")
  }
  };
}
