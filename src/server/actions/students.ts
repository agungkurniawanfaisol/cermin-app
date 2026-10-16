"use server";

import { cache } from "react";
import {
  StudentStatus,
  UserRole,
  UserStatus,
  type Prisma,
  type Student,
} from "@prisma/client";
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
import {
  AuthzError,
  assertCanAccessStudent,
  requireRole,
  requireSession,
} from "@/server/policies/access";
import {
  archiveStudentSchema,
  createStudentSchema,
  studentIdSchema,
  updateStudentSchema,
  type ArchiveStudentInput,
  type CreateStudentInput,
  type UpdateStudentInput,
} from "@/server/validations/student";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

function parseOptionalDob(value: string | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal lahir tidak valid");
  }
  return date;
}

export type ListedStudent = {
  id: string;
  displayName: string;
  fullName: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  status: StudentStatus;
  archivedReason: string | null;
  archivedAt: Date | null;
  createdAt: Date;
};

const studentListSelect = {
  id: true,
  displayName: true,
  fullName: true,
  phone: true,
  dateOfBirth: true,
  status: true,
  archivedReason: true,
  archivedAt: true,
  createdAt: true,
} as const;

export async function listStudentsForViewer(
  raw: ListQueryInput = {},
): Promise<ListResult<ListedStudent>> {
  const user = await requireSession();
  const parsed = parseListQuery(raw, {
    allowedSort: ["name", "createdAt"],
    defaultSort: "name",
    defaultOrder: "asc",
    filters: { status: ["ACTIVE", "ARCHIVED", "ALL"] },
  });

  const statusFilter = parsed.filters.status;
  const and: Prisma.StudentWhereInput[] = [];

  if (user.role === "TERAPIS") {
    and.push({
      therapistAssignments: {
        some: { therapistId: user.id, endedAt: null },
      },
    });
  } else if (user.role === "ORANG_TUA") {
    and.push({
      parentLinks: {
        some: { parentId: user.id, isActive: true },
      },
    });
  }

  if (statusFilter === "ACTIVE" || statusFilter === "ARCHIVED") {
    and.push({ status: statusFilter });
  } else if (user.role !== "ADMIN") {
    // Non-admin default: active only unless explicitly filtered.
    and.push({ status: StudentStatus.ACTIVE });
  }

  if (parsed.q) {
    and.push({
      OR: [
        { displayName: { contains: parsed.q, mode: "insensitive" } },
        { fullName: { contains: parsed.q, mode: "insensitive" } },
        { phone: { contains: parsed.q, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.StudentWhereInput =
    and.length === 0 ? {} : { AND: and };

  const orderBy: Prisma.StudentOrderByWithRelationInput =
    parsed.sort === "createdAt"
      ? { createdAt: parsed.order }
      : { displayName: parsed.order };

  // Count + page in parallel (was waterfall ~2 round-trips).
  const skip = (Math.max(parsed.page, 1) - 1) * parsed.pageSize;
  const [total, items] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      select: studentListSelect,
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

/** Compact active list for session start dropdown (capped). */
/** Deduped per RSC request (filter + form mulai sesi). */
export const listActiveStudentsForSession = cache(async (): Promise<
  Array<{ id: string; displayName: string }>
> => {
  const user = await requireSession();
  const and: Prisma.StudentWhereInput[] = [{ status: StudentStatus.ACTIVE }];

  if (user.role === "TERAPIS") {
    and.push({
      therapistAssignments: {
        some: { therapistId: user.id, endedAt: null },
      },
    });
  } else if (user.role === "ORANG_TUA") {
    and.push({
      parentLinks: {
        some: { parentId: user.id, isActive: true },
      },
    });
  }

  return prisma.student.findMany({
    where: { AND: and },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
    take: 50,
  });
});

export type StudentDetail = Omit<Student, "adminNotes" | "allergies"> & {
  /** Only present when viewer role is ADMIN. */
  adminNotes?: string | null;
  /** Only present when viewer role is ADMIN. */
  allergies?: string | null;
  therapistAssignments: Array<{
    id: string;
    therapistId: string;
    startedAt: Date;
    endedAt: Date | null;
    therapist: { id: string; name: string; email: string };
    assignedBy: { id: string; name: string };
  }>;
  parentLinks: Array<{
    id: string;
    parentId: string;
    relationLabel: string | null;
    isActive: boolean;
    parent: { id: string; name: string; email: string };
  }>;
};

export async function getStudentDetail(
  studentId: string,
): Promise<StudentDetail> {
  const user = await requireSession();
  const parsed = studentIdSchema.safeParse({ studentId });
  if (!parsed.success) {
    throw new AuthzError(
      parsed.error.issues[0]?.message ?? "ID murid tidak valid",
      400,
    );
  }

  if (user.role !== "ADMIN") {
    await assertCanAccessStudent(user, studentId);
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      therapistAssignments: {
        include: {
          therapist: { select: { id: true, name: true, email: true } },
          assignedBy: { select: { id: true, name: true } },
        },
        orderBy: { startedAt: "desc" },
      },
      parentLinks: {
        include: {
          parent: { select: { id: true, name: true, email: true } },
        },
        orderBy: { parent: { name: "asc" } },
      },
    },
  });

  if (!student) throw new AuthzError("Murid tidak ditemukan", 404);

  if (user.role === "ADMIN") return student;

  const { adminNotes, allergies, ...safe } = student;
  void adminNotes;
  void allergies;
  return safe;
}

export async function createStudent(
  input: CreateStudentInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = createStudentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const {
      displayName,
      fullName,
      dateOfBirth,
      homeAddress,
      rt,
      rw,
      phone,
      emergencyContactName,
      emergencyContactPhone,
      homeLanguage,
      preferQuiet,
      preferDimLight,
      sensoryNotes,
      allergies,
      requirePhotoForSession,
      adminNotes,
      parentId,
      relationLabel,
    } = parsed.data;
    const dob = parseOptionalDob(dateOfBirth);

    if (parentId) {
      const parent = await prisma.user.findUnique({ where: { id: parentId } });
      if (!parent || parent.role !== UserRole.ORANG_TUA) {
        return { ok: false, error: "Orang tua tidak ditemukan" };
      }
      if (parent.status !== UserStatus.ACTIVE) {
        return { ok: false, error: "Orang tua nonaktif" };
      }
    }

    const { student, linkId } = await prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: {
          displayName,
          fullName: fullName ?? null,
          dateOfBirth: dob ?? null,
          homeAddress: homeAddress ?? null,
          rt: rt ?? null,
          rw: rw ?? null,
          phone: phone ?? null,
          emergencyContactName: emergencyContactName ?? null,
          emergencyContactPhone: emergencyContactPhone ?? null,
          homeLanguage: homeLanguage ?? null,
          preferQuiet: preferQuiet ?? false,
          preferDimLight: preferDimLight ?? false,
          sensoryNotes: sensoryNotes ?? null,
          allergies: allergies ?? null,
          requirePhotoForSession: requirePhotoForSession ?? false,
          adminNotes: adminNotes || null,
        },
      });

      let createdLinkId: string | null = null;
      if (parentId) {
        const link = await tx.parentLink.create({
          data: {
            parentId,
            studentId: created.id,
            relationLabel: relationLabel || null,
          },
        });
        createdLinkId = link.id;
      }

      return { student: created, linkId: createdLinkId };
    });

    await writeAudit({
      actorId: admin.id,
      action: "student.create",
      entityType: "Student",
      entityId: student.id,
      metadata: {
        displayName,
        ...(parentId ? { parentId, relationLabel: relationLabel || null } : {}),
      },
    });

    if (parentId && linkId) {
      await writeAudit({
        actorId: admin.id,
        action: "parent.link",
        entityType: "ParentLink",
        entityId: linkId,
        metadata: { studentId: student.id, parentId, relationLabel },
      });
    }

    revalidatePath("/dashboard/murid");
    return { ok: true, data: { id: student.id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal membuat murid"),
    };
  }
}

export async function updateStudent(
  input: UpdateStudentInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = updateStudentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const {
      id,
      displayName,
      fullName,
      dateOfBirth,
      homeAddress,
      rt,
      rw,
      phone,
      emergencyContactName,
      emergencyContactPhone,
      homeLanguage,
      preferQuiet,
      preferDimLight,
      sensoryNotes,
      allergies,
      requirePhotoForSession,
      adminNotes,
    } = parsed.data;
    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      return { ok: false, error: "Murid tidak ditemukan" };
    }

    const dob = parseOptionalDob(dateOfBirth);
    const nullIfEmpty = (v: string | undefined) =>
      v === undefined ? undefined : v || null;

    await prisma.student.update({
      where: { id },
      data: {
        displayName,
        fullName: nullIfEmpty(fullName),
        ...(dob !== undefined ? { dateOfBirth: dob } : {}),
        homeAddress: nullIfEmpty(homeAddress),
        rt: nullIfEmpty(rt),
        rw: nullIfEmpty(rw),
        phone: nullIfEmpty(phone),
        emergencyContactName: nullIfEmpty(emergencyContactName),
        emergencyContactPhone: nullIfEmpty(emergencyContactPhone),
        homeLanguage: nullIfEmpty(homeLanguage),
        ...(preferQuiet !== undefined ? { preferQuiet } : {}),
        ...(preferDimLight !== undefined ? { preferDimLight } : {}),
        sensoryNotes: nullIfEmpty(sensoryNotes),
        allergies: nullIfEmpty(allergies),
        ...(requirePhotoForSession !== undefined
          ? { requirePhotoForSession }
          : {}),
        adminNotes: adminNotes === undefined ? undefined : adminNotes || null,
      },
    });

    await writeAudit({
      actorId: admin.id,
      action: "student.update",
      entityType: "Student",
      entityId: id,
      metadata: { displayName },
    });

    revalidatePath("/dashboard/murid");
    revalidatePath(`/dashboard/murid/${id}`);
    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal memperbarui murid"),
    };
  }
}

/**
 * Hapus lunak murid (status → ARCHIVED). Alasan wajib.
 * Menutup penugasan terapis aktif. Data sesi tetap ada untuk riwayat.
 */
export async function archiveStudent(
  input: ArchiveStudentInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = archiveStudentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const { studentId, reason } = parsed.data;

    const existing = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, displayName: true, status: true },
    });
    if (!existing) {
      return { ok: false, error: "Murid tidak ditemukan" };
    }
    if (existing.status === StudentStatus.ARCHIVED) {
      return { ok: false, error: "Murid sudah dihapus (diarsipkan)" };
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.therapistAssignment.updateMany({
        where: { studentId, endedAt: null },
        data: { endedAt: now },
      }),
      prisma.student.update({
        where: { id: studentId },
        data: {
          status: StudentStatus.ARCHIVED,
          archivedReason: reason,
          archivedAt: now,
          archivedById: admin.id,
        },
      }),
    ]);

    await writeAudit({
      actorId: admin.id,
      action: "student.archive",
      entityType: "Student",
      entityId: studentId,
      metadata: {
        displayName: existing.displayName,
        reason,
      },
    });

    revalidatePath("/dashboard/murid");
    revalidatePath(`/dashboard/murid/${studentId}`);
    return { ok: true, data: { id: studentId } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menghapus murid"),
    };
  }
}
