import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BillingCheckout } from "@/components/billing-checkout";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { countPlanRedemptions, hasActivePlan } from "@/lib/subscription";
import { formatInr } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Standalone shell so this page reads well outside the marketing/dashboard chrome. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent">WEALTH RESEARCH DESK</p>
          <p className="mt-1 text-sm text-muted">Private plan invitation</p>
        </div>
        {children}
      </div>
    </main>
  );
}

export default async function PlanAccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const plan = await prisma.planConfig.findUnique({ where: { accessToken: token } });

  if (!plan || !plan.isActive || !plan.isPrivate) {
    return (
      <Shell>
        <Card className="space-y-3 text-center">
          <CardTitle>This link is invalid or expired</CardTitle>
          <p className="text-sm text-muted">
            The access link you followed is no longer active. Please contact whoever shared it with you.
          </p>
          <Link href="/" className="text-sm text-accent">
            Go to homepage
          </Link>
        </Card>
      </Shell>
    );
  }

  const user = await getCurrentUser();
  const isFree = plan.amountPaise <= 0;

  // Not signed in -> route through login and come straight back to this link.
  if (!user) {
    const next = encodeURIComponent(`/plans/${token}`);
    return (
      <Shell>
        <Card className="space-y-4">
          <div>
            <CardTitle>{plan.name}</CardTitle>
            <p className="mt-1 text-sm text-muted">
              {isFree ? "Complimentary access" : formatInr(plan.amountPaise)} &middot; {plan.durationDays} days
            </p>
          </div>
          <p className="text-sm text-muted">
            Sign in to your account to activate this special plan. Your invitation link will be waiting.
          </p>
          <div className="flex gap-2">
            <Link href={`/login?next=${next}`} className="flex-1">
              <Button className="w-full">Sign in</Button>
            </Link>
            <Link href={`/register?next=${next}`} className="flex-1">
              <Button variant="secondary" className="w-full">
                Create account
              </Button>
            </Link>
          </div>
        </Card>
      </Shell>
    );
  }

  const [alreadyActive, redeemed] = await Promise.all([
    hasActivePlan(user.id, plan.code),
    countPlanRedemptions(plan.code)
  ]);

  if (alreadyActive) {
    return (
      <Shell>
        <Card className="space-y-3 text-center">
          <Badge tone="success">Already active</Badge>
          <CardTitle>{plan.name} is active on your account</CardTitle>
          <p className="text-sm text-muted">You already have full access to this plan.</p>
          <Link href="/dashboard/subscription" className="text-sm text-accent">
            View my subscription →
          </Link>
        </Card>
      </Shell>
    );
  }

  const limitReached = plan.maxRedemptions != null && redeemed >= plan.maxRedemptions;
  if (limitReached) {
    return (
      <Shell>
        <Card className="space-y-3 text-center">
          <CardTitle>This invitation is fully claimed</CardTitle>
          <p className="text-sm text-muted">
            The maximum number of members for this special plan has been reached.
          </p>
          <Link href="/membership" className="text-sm text-accent">
            See our public plans →
          </Link>
        </Card>
      </Shell>
    );
  }

  const slotsLeft = plan.maxRedemptions != null ? plan.maxRedemptions - redeemed : null;

  return (
    <Shell>
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{plan.name}</CardTitle>
            {plan.description && <p className="mt-1 text-sm text-muted">{plan.description}</p>}
          </div>
          <Badge tone="accent">{isFree ? "Free" : "Special"}</Badge>
        </div>

        {plan.features.length > 0 && (
          <ul className="space-y-1.5 text-sm">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="mt-1 text-accent">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}

        {slotsLeft != null && (
          <p className="text-xs text-muted">
            {slotsLeft} member {slotsLeft === 1 ? "slot" : "slots"} remaining on this invitation.
          </p>
        )}
      </Card>

      <BillingCheckout
        plan={{
          code: plan.code,
          name: plan.name,
          amountPaise: plan.amountPaise,
          durationDays: plan.durationDays
        }}
        paymentsConfigured={isRazorpayConfigured()}
        accessToken={token}
      />
    </Shell>
  );
}
