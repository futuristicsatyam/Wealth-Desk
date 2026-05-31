/** Public legal pages. Bodies can be overridden by ManagedContent in the DB. */
export type LegalSlug = "disclaimer" | "privacy" | "terms" | "refund";

type LegalDoc = { slug: LegalSlug; title: string; body: string };

export const LEGAL_DOCS: Record<LegalSlug, LegalDoc> = {
  disclaimer: {
    slug: "disclaimer",
    title: "Market Risk Disclosure & Disclaimer",
    body: [
      "Investments in securities markets are subject to market risks. Trading in leveraged products such as Futures & Options can result in losses that exceed the initial capital deployed.",
      "Wealth Research Desk publishes research, analysis and educational trade ideas prepared by SEBI-registered research analysts. We do NOT execute trades on behalf of members, manage client funds, or provide portfolio management services.",
      "No content on this platform should be interpreted as a guarantee, assurance or projection of profit. Past performance is not indicative of future results. Members must take independent decisions in their own broker accounts and should consult a qualified financial adviser where appropriate.",
      "Performance information, where shown, is presented for transparency in points or outcomes and does not represent realised returns on any specific capital base."
    ].join("\n\n")
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    body: [
      "We collect the information required to operate a compliant research subscription service: your name, email, mobile number, and KYC identifiers (PAN and Aadhaar).",
      "KYC identifiers are stored to satisfy regulatory and trial-eligibility requirements and are never displayed in full within the product. Payment processing is handled by Razorpay; we do not store card or bank credentials.",
      "We use your contact details only to deliver research, account, billing and service notifications. You may request access to or deletion of your personal data by contacting support, subject to applicable record-keeping obligations.",
      "We do not sell personal data to third parties."
    ].join("\n\n")
  },
  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    body: [
      "By creating an account you agree to use Wealth Research Desk for personal, non-commercial research purposes only. Membership is individual and non-transferable.",
      "Research content is the intellectual property of Wealth Research Desk. Redistribution, resale or public sharing of trade ideas, outlooks or alerts is prohibited.",
      "Subscriptions are time-bound and renew only when you initiate a new payment unless an explicit auto-renewal is configured. The one-time 5-day trial is available once per verified user.",
      "We may suspend accounts that violate these terms or applicable regulations."
    ].join("\n\n")
  },
  refund: {
    slug: "refund",
    title: "Refund & Cancellation Policy",
    body: [
      "Because research content is delivered digitally and immediately upon subscription activation, subscription fees are generally non-refundable once access has begun.",
      "If a payment is deducted but access is not granted due to a technical error, the full amount will be refunded to the original payment method within 7-10 working days after verification.",
      "You may cancel auto-renewal at any time from your billing page; cancellation stops future charges and does not shorten the current paid period.",
      "For any billing dispute, contact support with your invoice number within 7 days of the transaction."
    ].join("\n\n")
  }
};

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCS) as LegalSlug[];

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as string[]).includes(value);
}
