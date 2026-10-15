"use server";

import { createHash } from "node:crypto";
import { UserRole, UserStatus } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { AuthzError, requireRole } from "@/server/policies/access";
import {
  acceptInviteSchema,
  createInviteSchema,
  type AcceptInviteInput,
  type CreateInviteInput,
} from "@/server/validations/invite";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AuthzError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function createInvite(
  input: CreateInviteInput,
): Promise<ActionResult<{ inviteUrl: string; inviteId: string }>> {
  try {
    const admin = await requireRole("ADMIN");
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
    return { ok: false, error: toErrorMessage(error, "Gagal membuat undangan") };
  }
}

export async function acceptInvite(
  input: AcceptInviteInput,
): Promise<ActionResult<{ userId: string }>> {
  try {
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
      error: toErrorMessage(error, "Gagal menerima undangan"),
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
};

export async function listUsers(): Promise<ListedUser[]> {
  await requireRole("ADMIN");
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function disableUser(
  userId: string,
): Promise<ActionResult<{ userId: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    if (admin.id === userId) {
      return { ok: false, error: "Tidak dapat menonaktifkan akun sendiri" };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { ok: false, error: "Pengguna tidak ditemukan" };
    }
    if (user.status === UserStatus.DISABLED) {
      return { ok: false, error: "Pengguna sudah nonaktif" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.DISABLED },
    });

    await writeAudit({
      actorId: admin.id,
      action: "user.disable",
      entityType: "User",
      entityId: userId,
      metadata: { email: user.email, role: user.role },
    });

    revalidatePath("/dashboard/pengguna");
    return { ok: true, data: { userId } };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Gagal menonaktifkan pengguna"),
    };
  }
}
