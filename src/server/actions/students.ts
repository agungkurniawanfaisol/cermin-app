"use server";

import { StudentStatus, type Student } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  AuthzError,
  assertCanAccessStudent,
  requireRole,
  requireSession,
} from "@/server/policies/access";
import {
  createStudentSchema,
  studentIdSchema,
  updateStudentSchema,
  type CreateStudentInput,
  type UpdateStudentInput,
} from "@/server/validations/student";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AuthzError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

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
  dateOfBirth: Date | null;
  status: StudentStatus;
  createdAt: Date;
};

export async function listStudentsForViewer(): Promise<ListedStudent[]> {
  const user = await requireSession();

  if (user.role === "ADMIN") {
    return prisma.student.findMany({
      select: {
        id: true,
        displayName: true,
        dateOfBirth: true,
        status: true,
        createdAt: true,
      },
      orderBy: { displayName: "asc" },
    });
  }

  if (user.role === "TERAPIS") {
    return prisma.student.findMany({
      where: {
        status: StudentStatus.ACTIVE,
        therapistAssignments: {
          some: { therapistId: user.id, endedAt: null },
        },
      },
      select: {
        id: true,
        displayName: true,
        dateOfBirth: true,
        status: true,
        createdAt: true,
      },
      orderBy: { displayName: "asc" },
    });
  }

  // ORANG_TUA
  return prisma.student.findMany({
    where: {
      status: StudentStatus.ACTIVE,
      parentLinks: {
        some: { parentId: user.id, isActive: true },
      },
    },
    select: {
      id: true,
      displayName: true,
      dateOfBirth: true,
      status: true,
      createdAt: true,
    },
    orderBy: { displayName: "asc" },
  });
}

export type StudentDetail = Student & {
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
  return student;
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

    const { displayName, dateOfBirth, adminNotes } = parsed.data;
    const dob = parseOptionalDob(dateOfBirth);

    const student = await prisma.student.create({
      data: {
        displayName,
        dateOfBirth: dob ?? null,
        adminNotes: adminNotes || null,
      },
    });

    await writeAudit({
      actorId: admin.id,
      action: "student.create",
      entityType: "Student",
      entityId: student.id,
      metadata: { displayName },
    });

    revalidatePath("/dashboard/murid");
    return { ok: true, data: { id: student.id } };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Gagal membuat murid"),
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

    const { id, displayName, dateOfBirth, adminNotes } = parsed.data;
    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      return { ok: false, error: "Murid tidak ditemukan" };
    }

    const dob = parseOptionalDob(dateOfBirth);

    await prisma.student.update({
      where: { id },
      data: {
        displayName,
        ...(dob !== undefined ? { dateOfBirth: dob } : {}),
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
      error: toErrorMessage(error, "Gagal memperbarui murid"),
    };
  }
}

export async function archiveStudent(
  studentId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = studentIdSchema.safeParse({ studentId });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const existing = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!existing) {
      return { ok: false, error: "Murid tidak ditemukan" };
    }
    if (existing.status === StudentStatus.ARCHIVED) {
      return { ok: false, error: "Murid sudah diarsipkan" };
    }

    await prisma.student.update({
      where: { id: studentId },
      data: { status: StudentStatus.ARCHIVED },
    });

    await writeAudit({
      actorId: admin.id,
      action: "student.archive",
      entityType: "Student",
      entityId: studentId,
      metadata: { displayName: existing.displayName },
    });

    revalidatePath("/dashboard/murid");
    revalidatePath(`/dashboard/murid/${studentId}`);
    return { ok: true, data: { id: studentId } };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Gagal mengarsipkan murid"),
    };
  }
}
