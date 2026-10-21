"use server";

import { createHash } from "node:crypto";
import { UserRole, UserStatus, type Prisma } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { toActionError } from "@/lib/action-error";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  paginationMeta,
  parseListQuery,
  toListResult,
  type ListQueryInput,
  type ListResult,
} from "@/lib/list-query";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { z } from "zod";
import { requireRole } from "@/server/policies/access";
import {
  acceptInviteSchema,
  createInviteSchema,
  type AcceptInviteInput,
  type CreateInviteInput,
} from "@/server/validations/invite";
import {
  disableUserSchema,
  type DisableUserInput,
} from "@/server/validations/user";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createInvite(
  input: CreateInviteInput,
): Promise<ActionResult<{ inviteUrl: string; inviteId: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    const ip = await getRequestIp();
    const inviteLimit = checkRateLimit(
      `invite:create:${admin.id}:${ip}`,
      15,
      60 * 60 * 1000,
    );
    if (!inviteLimit.ok) {
      return { ok: false, error: RATE_LIMIT_MESSAGE };
    }

    const parsed = createInviteSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const { email, role, name } = parsed.data;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { ok: false, error: "Email sudah terdaftar" };
    }

    const rawToken = nanoid(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const invite = await prisma.inviteToken.create({
      data: {
        email,
        name,
        role: role as UserRole,
        tokenHash,
        expiresAt,
        createdById: admin.id,
      },
    });

    await writeAudit({
      actorId: admin.id,
      action: "invite.create",
      entityType: "InviteToken",
      entityId: invite.id,
      metadata: { email, role, name },
    });

    return {
      ok: true,
      data: {
        inviteId: invite.id,
        inviteUrl: `/terima-undangan?token=${rawToken}`,
      },
    };
  } catch (error) {
    return { ok: false, error: toActionError(error, "Gagal membuat undangan") };
  }
}

export async function acceptInvite(
  input: AcceptInviteInput,
): Promise<ActionResult<{ userId: string }>> {
  try {
    const ip = await getRequestIp();
    const acceptLimit = checkRateLimit(
      `invite:accept:${ip}`,
      10,
      60 * 60 * 1000,
    );
    if (!acceptLimit.ok) {
      return { ok: false, error: RATE_LIMIT_MESSAGE };
    }

    const parsed = acceptInviteSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const { token, password } = parsed.data;
    const tokenHash = hashToken(token);
    const invite = await prisma.inviteToken.findUnique({
      where: { tokenHash },
    });

    if (!invite) {
      return { ok: false, error: "Undangan tidak valid" };
    }
    if (invite.usedAt) {
      return { ok: false, error: "Undangan sudah digunakan" };
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      return { ok: false, error: "Undangan sudah kedaluwarsa" };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
    });
    if (existingUser) {
      return { ok: false, error: "Email sudah terdaftar" };
    }

    const hashed = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: invite.email,
          name: invite.name,
          role: invite.role,
          emailVerified: true,
          preference: { create: {} },
        },
      });
      await tx.account.create({
        data: {
          userId: created.id,
          accountId: created.id,
          providerId: "credential",
          password: hashed,
        },
      });
      await tx.inviteToken.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });
      return created;
    });

    await writeAudit({
      actorId: user.id,
      action: "invite.accept",
      entityType: "User",
      entityId: user.id,
      metadata: {
        inviteId: invite.id,
        email: invite.email,
        role: invite.role,
      },
    });

    return { ok: true, data: { userId: user.id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menerima undangan"),
    };
  }
}

export type ListedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  disabledReason: string | null;
  disabledAt: Date | null;
  disabledBy: { id: string; name: string } | null;
};

export async function listUsers(
  raw: ListQueryInput = {},
): Promise<ListResult<ListedUser>> {
  await requireRole("ADMIN");
  const parsed = parseListQuery(raw, {
    allowedSort: ["name", "email", "createdAt"],
    defaultSort: "createdAt",
    defaultOrder: "desc",
    filters: {
      role: ["ADMIN", "TERAPIS", "ORANG_TUA", "ALL"],
      status: ["ACTIVE", "DISABLED", "ALL"],
    },
  });

  const and: Prisma.UserWhereInput[] = [];
  if (parsed.filters.role && parsed.filters.role !== "ALL") {
    and.push({ role: parsed.filters.role as UserRole });
  }
  if (parsed.filters.status && parsed.filters.status !== "ALL") {
    and.push({ status: parsed.filters.status as UserStatus });
  }
  if (parsed.q) {
    and.push({
      OR: [
        { name: { contains: parsed.q, mode: "insensitive" } },
        { email: { contains: parsed.q, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.UserWhereInput =
    and.length === 0 ? {} : { AND: and };

  const orderBy: Prisma.UserOrderByWithRelationInput =
    parsed.sort === "name"
      ? { name: parsed.order }
      : parsed.sort === "email"
        ? { email: parsed.order }
        : { createdAt: parsed.order };

  const skip = (Math.max(parsed.page, 1) - 1) * parsed.pageSize;
  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        disabledReason: true,
        disabledAt: true,
        disabledBy: { select: { id: true, name: true } },
      },
      orderBy,
      skip,
      take: parsed.pageSize,
    }),
  ]);
  const meta = paginationMeta({
    page: parsed.page,
    pageSize: parsed.pageSize,
    total,
  });

  return toListResult(items, meta);
}

export async function disableUser(
  input: DisableUserInput,
): Promise<ActionResult<{ userId: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = disableUserSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }
    const { userId: id, reason } = parsed.data;

    if (admin.id === id) {
      return { ok: false, error: "Tidak dapat menghapus akun sendiri" };
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!user) {
      return { ok: false, error: "Pengguna tidak ditemukan" };
    }
    if (user.status === UserStatus.DISABLED) {
      return { ok: false, error: "Pengguna sudah nonaktif" };
    }

    const now = new Date();
    await prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.DISABLED,
        disabledReason: reason,
        disabledAt: now,
        disabledById: admin.id,
      },
    });

    await writeAudit({
      actorId: admin.id,
      action: "user.disable",
      entityType: "User",
      entityId: id,
      metadata: { email: user.email, role: user.role, reason },
    });

    revalidatePath("/dashboard/pengguna");
    return { ok: true, data: { userId: id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menghapus pengguna"),
    };
  }
}
