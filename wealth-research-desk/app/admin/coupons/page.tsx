import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CouponForm } from "@/components/admin/coupon-form";
import { prisma } from "@/lib/prisma";
import { formatInr, formatDate } from "@/lib/format";
import { toggleCouponActiveAction, deleteCouponAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const [coupons, plans] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.planConfig.findMany({
      where: { isActive: true, isTrial: false },
      select: { code: true },
      orderBy: { sortOrder: "asc" }
    })
  ]);
  const planCodes = plans.map((plan) => plan.code);
  const now = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Coupons</h1>
        <p className="mt-1 text-sm text-muted">
          Create discount codes members can apply at checkout. Usage is counted only when a discounted
          payment succeeds.
        </p>
      </div>

      <Card>
        <CardTitle>Create a coupon</CardTitle>
        <div className="mt-4">
          <CouponForm planCodes={planCodes} />
        </div>
      </Card>

      <Card>
        <CardTitle>All coupons</CardTitle>
        {coupons.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No coupons yet" hint="Create your first discount code above." />
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {coupons.map((coupon) => {
              const expired = coupon.expiresAt != null && coupon.expiresAt.getTime() < now;
              const exhausted =
                coupon.maxRedemptions != null && coupon.timesRedeemed >= coupon.maxRedemptions;
              const discountLabel =
                coupon.discountType === "PERCENT"
                  ? `${coupon.discountValue}% off`
                  : `${formatInr(coupon.discountValue)} off`;
              return (
                <div key={coupon.id} className="rounded-lg border border-border bg-surface px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-semibold">{coupon.code}</p>
                        <Badge tone="accent">{discountLabel}</Badge>
                        <Badge tone={coupon.isActive && !expired && !exhausted ? "success" : "neutral"}>
                          {!coupon.isActive
                            ? "Disabled"
                            : expired
                              ? "Expired"
                              : exhausted
                                ? "Used up"
                                : "Active"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {coupon.description ? `${coupon.description} · ` : ""}
                        Used {coupon.timesRedeemed}
                        {coupon.maxRedemptions != null ? `/${coupon.maxRedemptions}` : ""} &middot;{" "}
                        {coupon.perUserLimit} per member
                        {coupon.minAmountPaise > 0 && <> &middot; min {formatInr(coupon.minAmountPaise)}</>}
                        {coupon.planCodes.length > 0 && <> &middot; {coupon.planCodes.join(", ")}</>}
                        {coupon.expiresAt && <> &middot; expires {formatDate(coupon.expiresAt)}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <form action={toggleCouponActiveAction}>
                        <input type="hidden" name="couponId" value={coupon.id} />
                        <Button type="submit" size="sm" variant="secondary">
                          {coupon.isActive ? "Disable" : "Enable"}
                        </Button>
                      </form>
                      {coupon.timesRedeemed === 0 && (
                        <form action={deleteCouponAction}>
                          <input type="hidden" name="couponId" value={coupon.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            Delete
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
