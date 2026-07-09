import type { Metadata } from "next";
import { PricingTable } from "@/components/pricing-table";
import { Card } from "@/components/ui/card";
import { getActivePlans, getTrialPlanInfo } from "@/lib/plans";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Membership",
  description: "Membership plans for Wealth Research Desk - trial and paid options with GST invoices."
};

export const dynamic = "force-dynamic";

export default async function MembershipPage() {
  const [plans, user, trial] = await Promise.all([
    getActivePlans(),
    getCurrentUser(),
    getTrialPlanInfo()
  ]);

  return (
    <main className="container-page py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Membership</p>
      <h1 className="mt-3 text-4xl font-semibold">Choose how you access research</h1>
      <p className="mt-4 max-w-2xl text-sm text-muted">
        Begin with a one-time {trial.days}-day trial, then move to a plan that fits your trading
        horizon. All paid plans include dashboard access, market outlooks and alert delivery.
      </p>

      <div className="mt-8">
        <PricingTable
          plans={plans}
          context="public"
          isAuthenticated={Boolean(user)}
          trialEligible={false}
          hasKyc={false}
        />
      </div>

      <Card className="mt-8 space-y-2">
        <p className="font-semibold">What is included with every plan</p>
        <ul className="grid gap-1.5 text-sm text-muted sm:grid-cols-2">
          <li>&#8226; Daily F&amp;O and equity research</li>
          <li>&#8226; Daily market outlook</li>
          <li>&#8226; Dashboard alert delivery</li>
          <li>&#8226; Closed-trade performance transparency</li>
          {/* <li>&#8226; GST invoice on every paid transaction</li> */}
          <li>&#8226; Member support tickets</li>
        </ul>
      </Card>
    </main>
  );
}
