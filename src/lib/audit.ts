import type { Prisma } from "@prisma/client";
import { sanitizeAuditMetadata } from "@/lib/audit-safe";
import { prisma } from "@/lib/db";

export async function writeAudit(input: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const metadata = sanitizeAuditMetadata(input.metadata);
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export { sanitizeAuditMetadata, isSensitiveAuditKey } from "@/lib/audit-safe";
export {
  REQUIRED_AUDIT_ACTIONS,
  OPTIONAL_AUDIT_ACTIONS,
} from "@/lib/audit-actions";
