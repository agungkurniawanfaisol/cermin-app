"use server";

import type { Prisma } from "@prisma/client";
import { requireRole } from "@/server/policies/access";
import { prisma } from "@/lib/db";
import { sanitizeAuditMetadata } from "@/lib/audit-safe";
import {
  paginationMeta,
  parseListQuery,
  toListResult,
  type ListQueryInput,
  type ListResult,
} from "@/lib/list-query";
import {
  ALL_AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  auditDateRangeSchema,
} from "@/server/validations/audit";

export type ListedAuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  actor: { id: string; name: string; email: string } | null;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Daftar audit Admin — paginated, lean select, metadata di-sanitize lagi saat baca.
 */
export async function listAuditLogsForAdmin(
  raw: ListQueryInput = {},
): Promise<ListResult<ListedAuditLog>> {
  await requireRole("ADMIN");

  const parsed = parseListQuery(raw, {
    allowedSort: ["createdAt"],
    defaultSort: "createdAt",
    defaultOrder: "desc",
    filters: {
      action: ["ALL", ...ALL_AUDIT_ACTIONS],
      entityType: ["ALL", ...AUDIT_ENTITY_TYPES],
    },
  });

  const dateRange = auditDateRangeSchema.safeParse({
    from: firstParam(raw.from),
    to: firstParam(raw.to),
  });
  const from = dateRange.success ? dateRange.data.from : undefined;
  const to = dateRange.success ? dateRange.data.to : undefined;

  const and: Prisma.AuditLogWhereInput[] = [];

  if (parsed.filters.action && parsed.filters.action !== "ALL") {
    and.push({ action: parsed.filters.action });
  }
  if (parsed.filters.entityType && parsed.filters.entityType !== "ALL") {
    and.push({ entityType: parsed.filters.entityType });
  }
  if (parsed.q) {
    and.push({
      OR: [
        { action: { contains: parsed.q, mode: "insensitive" } },
        { entityType: { contains: parsed.q, mode: "insensitive" } },
      ],
    });
  }
  if (from || to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (from) createdAt.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) createdAt.lte = new Date(`${to}T23:59:59.999Z`);
    and.push({ createdAt });
  }

  const where: Prisma.AuditLogWhereInput =
    and.length > 0 ? { AND: and } : {};

  const total = await prisma.auditLog.count({ where });
  const meta = paginationMeta({
    page: parsed.page,
    pageSize: parsed.pageSize,
    total,
  });

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: parsed.order },
    skip: meta.skip,
    take: meta.take,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
      actor: { select: { id: true, name: true, email: true } },
    },
  });

  const items: ListedAuditLog[] = rows.map((row) => {
    const rawMeta =
      row.metadata &&
      typeof row.metadata === "object" &&
      !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : undefined;
    return {
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: sanitizeAuditMetadata(rawMeta) ?? null,
      createdAt: row.createdAt,
      actor: row.actor,
    };
  });

  return toListResult(items, meta);
}
