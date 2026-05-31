import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about Wealth Research Desk membership and research."
};

const FAQS = [
  ["Do you execute trades for members?", "No. We publish research and educational trade ideas. Members execute independently in their own broker accounts."],
  ["Do you guarantee profits?", "No. Markets carry risk and no outcome is guaranteed. We publish a documented rationale and a risk rating for every idea."],
  ["Can the trial be reused?", "The 5-day trial is available once per verified user. Completing KYC (PAN and Aadhaar) is required to start it."],
  ["How are payments handled?", "Payments are processed securely by Razorpay. We never store card or bank credentials. A GST invoice is issued for every paid transaction."],
  ["Can I cancel my subscription?", "You can stop auto-renewal at any time from the billing page. Access continues until the end of the paid period."],
  ["How do I get support?", "Raise a ticket from your dashboard support page, or email our support address listed in the footer."]
];

export default function FaqPage() {
  return (
    <main className="container-page py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Help centre</p>
      <h1 className="mt-3 text-4xl font-semibold">Frequently asked questions</h1>
      <div className="mt-8 grid gap-3">
        {FAQS.map(([question, answer]) => (
          <Card key={question} className="space-y-2">
            <p className="font-medium">{question}</p>
            <p className="text-sm text-muted">{answer}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
