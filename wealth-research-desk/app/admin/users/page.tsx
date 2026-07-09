import type { Prisma, Role } from "@prisma/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBanner } from "@/components/ui/page-banner";
import { UsersFilter } from "@/components/admin/users-filter";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { updateUserRoleAction, toggleUserBanAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const ROLES: Role[] = ["USER", "ANALYST", "ADMIN"];

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; sub?: string; error?: string }>;
}) {
  const admin = await requireAdmin();
  const { q: qRaw, role: roleRaw, status: statusRaw, sub: subRaw, error } = await searchParams;

  const ACTION_ERRORS: Record<string, string> = {
    self_role: "You cannot change your own role.",
    self_ban: "You cannot suspend your own account.",
    last_admin: "You cannot remove or suspend the last administrator.",
    not_found: "That user no longer exists.",
    invalid_role: "Invalid role selected."
  };
  const errorMessage = error ? ACTION_ERRORS[error] : undefined;

  const q = qRaw?.trim() ?? "";
  const role = roleRaw && ROLES.includes(roleRaw as Role) ? (roleRaw as Role) : "";
  const status = statusRaw === "active" || statusRaw === "suspended" ? statusRaw : "";
  const sub = subRaw === "subscribed" || subRaw === "free" ? subRaw : "";
  const filtered = Boolean(q || role || status || sub);
  const now = new Date();

  const where: Prisma.UserWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } }
          ]
        }
      : {}),
    ...(role ? { role } : {}),
    ...(status ? { isBanned: status === "suspended" } : {}),
    ...(sub === "subscribed"
      ? { subscriptions: { some: { status: "ACTIVE", endDate: { gte: now } } } }
      : {}),
    ...(sub === "free"
      ? { subscriptions: { none: { status: "ACTIVE", endDate: { gte: now } } } }
      : {})
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      subscriptions: {
        where: { status: "ACTIVE", endDate: { gte: now } },
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

      {errorMessage && <PageBanner tone="warning" message={errorMessage} />}

      <UsersFilter q={q} role={role} status={status} sub={sub} />

      <Card className="space-y-3">
        <CardTitle>
          {users.length}
          {users.length === 100 ? "+" : ""} {filtered ? "matching" : "registered"} user
          {users.length === 1 ? "" : "s"}
        </CardTitle>
        {users.length === 0 ? (
          <EmptyState
            title={filtered ? "No users match your filters" : "No users yet"}
            hint={filtered ? "Try clearing or changing the filters above." : undefined}
          />
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
