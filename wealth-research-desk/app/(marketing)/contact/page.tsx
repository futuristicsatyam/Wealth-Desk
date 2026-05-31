import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Mail, MessageSquare, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Wealth Research Desk team."
};

export default function ContactPage() {
  const supportEmail = process.env.SUPPORT_EMAIL || "support@wealthdesk.in";
  const sebi = process.env.SEBI_REGISTRATION || "INH000000000";

  return (
    <main className="container-page py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Contact</p>
      <h1 className="mt-3 text-4xl font-semibold">We are here to help</h1>
      <p className="mt-4 max-w-2xl text-sm text-muted">
        Existing members can raise a tracked ticket from the dashboard support page. For general
        enquiries, reach us through the channels below.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card className="space-y-2">
          <Mail className="text-accent" size={20} />
          <p className="font-semibold">Email support</p>
          <a href={`mailto:${supportEmail}`} className="text-sm text-accent">
            {supportEmail}
          </a>
        </Card>
        <Card className="space-y-2">
          <MessageSquare className="text-accent" size={20} />
          <p className="font-semibold">Member support</p>
          <p className="text-sm text-muted">Raise a ticket from your dashboard for the fastest response.</p>
        </Card>
        <Card className="space-y-2">
          <ShieldCheck className="text-accent" size={20} />
          <p className="font-semibold">Compliance</p>
          <p className="text-sm text-muted">SEBI Research Analyst Reg. No: {sebi}</p>
        </Card>
      </div>
    </main>
  );
}
