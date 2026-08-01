import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordForm } from "@/components/dashboard/change-password-form";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage your account and security.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <CardTitle>Account</CardTitle>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">Name</dt>
              <dd className="font-medium">{user.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">Email</dt>
              <dd className="flex items-center gap-2">
                <span className="font-medium">{user.email}</span>
                {user.emailVerifiedAt ? (
                  <Badge tone="success">Verified</Badge>
                ) : (
                  <Badge tone="neutral">Unverified</Badge>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">Mobile</dt>
              <dd className="flex items-center gap-2">
                <span className="font-medium">{user.phone}</span>
                {user.phoneVerifiedAt ? (
                  <Badge tone="success">Verified</Badge>
                ) : (
                  <Badge tone="neutral">Unverified</Badge>
                )}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="space-y-4">
          <CardTitle>Change password</CardTitle>
          <ChangePasswordForm />
        </Card>
      </div>
    </div>
  );
}
