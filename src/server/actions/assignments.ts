"use server";

import { UserRole, UserStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { AuthzError, requireRole } from "@/server/policies/access";
import {
  assignTherapistSchema,
  endTherapistAssignmentSchema,
  linkParentSchema,
  unlinkParentSchema,
  type AssignTherapistInput,
  type EndTherapistAssignmentInput,
  type LinkParentInput,
  type UnlinkParentInput,
} from "@/server/validations/student";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AuthzError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function assignTherapist(
  input: AssignTherapistInput,
): Promise<ActionResult<{ assignmentId: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = assignTherapistSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const { studentId, therapistId } = parsed.data;

    const [student, therapist] = await Promise.all([
      prisma.student.findUnique({ where: { id: studentId } }),
      prisma.user.findUnique({ where: { id: therapistId } }),
    ]);

    if (!student) {
      return { ok: false, error: "Murid tidak ditemukan" };
    }
    if (!therapist || therapist.role !== UserRole.TERAPIS) {
      return { ok: false, error: "Terapis tidak ditemukan" };
    }
    if (therapist.status !== UserStatus.ACTIVE) {
      return { ok: false, error: "Terapis nonaktif" };
    }

    const assignment = await prisma.$transaction(async (tx) => {
      // Enforce one active (therapistId, studentId) pair: end any existing.
      await tx.therapistAssignment.updateMany({
        where: {
          therapistId,
          studentId,
          endedAt: null,
        },
        data: { endedAt: new Date() },
      });

      const created = await tx.therapistAssignment.create({
        data: {
          therapistId,
          studentId,
          assignedById: admin.id,
        },
      });

      const activeCount = await tx.therapistAssignment.count({
        where: { therapistId, studentId, endedAt: null },
      });
      if (activeCount !== 1) {
        throw new Error("Gagal menegakkan satu penugasan aktif");
      }

      return created;
    });

    await writeAudit({
      actorId: admin.id,
      action: "assignment.assign",
      entityType: "TherapistAssignment",
      entityId: assignment.id,
      metadata: { studentId, therapistId },
    });

    revalidatePath("/dashboard/murid");
    revalidatePath(`/dashboard/murid/${studentId}`);
    return { ok: true, data: { assignmentId: assignment.id } };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Gagal menugaskan terapis"),
    };
  }
}

export async function endTherapistAssignment(
  input: EndTherapistAssignmentInput,
): Promise<ActionResult<{ assignmentId: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = endTherapistAssignmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const { assignmentId } = parsed.data;
    const existing = await prisma.therapistAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!existing) {
      return { ok: false, error: "Penugasan tidak ditemukan" };
    }
    if (existing.endedAt) {
      return { ok: false, error: "Penugasan sudah diakhiri" };
    }

    await prisma.therapistAssignment.update({
      where: { id: assignmentId },
      data: { endedAt: new Date() },
    });

    await writeAudit({
      actorId: admin.id,
      action: "assignment.end",
      entityType: "TherapistAssignment",
      entityId: assignmentId,
      metadata: {
        studentId: existing.studentId,
        therapistId: existing.therapistId,
      },
    });

    revalidatePath("/dashboard/murid");
    revalidatePath(`/dashboard/murid/${existing.studentId}`);
    return { ok: true, data: { assignmentId } };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Gagal mengakhiri penugasan"),
    };
  }
}

export async function linkParent(
  input: LinkParentInput,
): Promise<ActionResult<{ linkId: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = linkParentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const { studentId, parentId, relationLabel } = parsed.data;

    const [student, parent] = await Promise.all([
      prisma.student.findUnique({ where: { id: studentId } }),
      prisma.user.findUnique({ where: { id: parentId } }),
    ]);

    if (!student) {
      return { ok: false, error: "Murid tidak ditemukan" };
    }
    if (!parent || parent.role !== UserRole.ORANG_TUA) {
      return { ok: false, error: "Orang tua tidak ditemukan" };
    }
    if (parent.status !== UserStatus.ACTIVE) {
      return { ok: false, error: "Orang tua nonaktif" };
    }

    const existing = await prisma.parentLink.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
    });

    let linkId: string;
    if (existing) {
      if (existing.isActive) {
        return { ok: false, error: "Orang tua sudah ditautkan" };
      }
      const updated = await prisma.parentLink.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          relationLabel: relationLabel || existing.relationLabel,
        },
      });
      linkId = updated.id;
    } else {
      const created = await prisma.parentLink.create({
        data: {
          parentId,
          studentId,
          relationLabel: relationLabel || null,
        },
      });
      linkId = created.id;
    }

    await writeAudit({
      actorId: admin.id,
      action: "parent.link",
      entityType: "ParentLink",
      entityId: linkId,
      metadata: { studentId, parentId, relationLabel },
    });

    revalidatePath("/dashboard/murid");
    revalidatePath(`/dashboard/murid/${studentId}`);
    return { ok: true, data: { linkId } };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Gagal menautkan orang tua"),
    };
  }
}

export async function unlinkParent(
  input: UnlinkParentInput,
): Promise<ActionResult<{ linkId: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = unlinkParentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const { linkId } = parsed.data;
    const existing = await prisma.parentLink.findUnique({
      where: { id: linkId },
    });
    if (!existing) {
      return { ok: false, error: "Tautan tidak ditemukan" };
    }
    if (!existing.isActive) {
      return { ok: false, error: "Tautan sudah tidak aktif" };
    }

    await prisma.parentLink.update({
      where: { id: linkId },
      data: { isActive: false },
    });

    await writeAudit({
      actorId: admin.id,
      action: "parent.unlink",
      entityType: "ParentLink",
      entityId: linkId,
      metadata: {
        studentId: existing.studentId,
        parentId: existing.parentId,
      },
    });

    revalidatePath("/dashboard/murid");
    revalidatePath(`/dashboard/murid/${existing.studentId}`);
    return { ok: true, data: { linkId } };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Gagal melepas tautan orang tua"),
    };
  }
}
