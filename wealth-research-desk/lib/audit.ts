import { prisma } from "@/lib/prisma";

/**
 * Records a privileged action. Never throws into the caller - audit failure
 * must not break the underlying operation.
 */
export async function logAudit(params: {
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorName: params.actorName,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        summary: params.summary,
        metadata: (params.metadata ?? undefined) as never,
        ipAddress: params.ipAddress
      }
    });
  } catch (error) {
    console.error("[audit] failed to record action", params.action, error);
  }
}
