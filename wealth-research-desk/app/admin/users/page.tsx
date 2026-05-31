import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { updateUserRoleAction, toggleUserBanAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      subscriptions: {
        where: { status: "ACTIVE", endDate: { gte: new Date() } },
        select: { planName: true },
        take: 1
      }
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-muted">
          Manage roles and account status. You cannot change or suspend your own account, and the
          last administrator cannot be removed.
        </p>
      </div>

      <Card className="space-y-3">
        <CardTitle>{users.length} registered users</CardTitle>
        {users.length === 0 ? (
          <EmptyState title="No users yet" />
        ) : (
          <div className="space-y-3">
            {users.map((user) => {
              const isSelf = user.id === admin.id;
              return (
                <div key={user.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{user.name}</p>
                        <Badge tone={user.role === "ADMIN" ? "accent" : "neutral"}>
                          {user.role}
                        </Badge>
                        {user.isBanned && <Badge tone="danger">Suspended</Badge>}
                        {user.subscriptions.length > 0 && (
                          <Badge tone="success">{user.subscriptions[0].planName}</Badge>
                        )}
                        {isSelf && <Badge tone="neutral">You</Badge>}
                      </div>
                      <p className="text-xs text-muted">
                        {user.email} &middot; joined {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </div>

                  {!isSelf && (
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <form action={updateUserRoleAction} className="flex items-end gap-2">
                        <input type="hidden" name="userId" value={user.id} />
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-muted">
                            Role
                          </label>
                          <Select name="role" defaultValue={user.role} className="h-9">
                            <option value="USER">User</option>
                            <option value="ANALYST">Analyst</option>
                            <option value="ADMIN">Admin</option>
                          </Select>
                        </div>
                        <Button type="submit" size="sm" variant="secondary">
                          Update role
                        </Button>
                      </form>

                      <form action={toggleUserBanAction} className="flex items-end gap-2">
                        <input type="hidden" name="userId" value={user.id} />
                        {!user.isBanned && (
                          <Input
                            name="reason"
                            placeholder="Suspension reason"
                            className="h-9 w-44"
                          />
                        )}
                        <Button
                          type="submit"
                          size="sm"
                          variant={user.isBanned ? "secondary" : "danger"}
                        >
                          {user.isBanned ? "Reinstate" : "Suspend"}
                        </Button>
                      </form>
                    </div>
                  )}
                  {user.isBanned && user.bannedReason && (
                    <p className="mt-2 text-xs text-negative">Reason: {user.bannedReason}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
