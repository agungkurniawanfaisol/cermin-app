"use server";

import { revalidatePath } from "next/cache";
import { toActionError } from "@/lib/action-error";
import { writeAudit } from "@/lib/audit";
import {
  deleteAvatarObject,
  studentFamilyPhotoKey,
  uploadAvatarObject,
  userAvatarKey,
  validateAvatarFile,
  type StudentPhotoSlot,
} from "@/lib/avatar-storage";
import { prisma } from "@/lib/db";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import {
  assertCanAccessStudent,
  requireSession,
} from "@/server/policies/access";
import { studentIdSchema } from "@/server/validations/student";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

const SLOT_LABEL: Record<StudentPhotoSlot, string> = {
  murid: "murid",
  ayah: "ayah",
  ibu: "ibu",
};

function parsePhotoSlot(raw: FormDataEntryValue | null): StudentPhotoSlot | null {
  if (typeof raw !== "string") return null;
  if (raw === "murid" || raw === "ayah" || raw === "ibu") return raw;
  return null;
}

export async function uploadUserAvatar(
  formData: FormData,
): Promise<ActionResult<{ hasImage: true }>> {
  try {
    const user = await requireSession();
    const avatarLimit = checkRateLimit(
      `avatar:user:${user.id}`,
      10,
      60 * 60 * 1000,
    );
    if (!avatarLimit.ok) {
      return { ok: false, error: RATE_LIMIT_MESSAGE };
    }

    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File)) {
      return { ok: false, error: "File foto wajib diunggah" };
    }
    const validated = validateAvatarFile(fileEntry);
    if (!validated.ok) return { ok: false, error: validated.error };

    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { image: true },
    });

    const storageKey = userAvatarKey(user.id, validated.ext);
    const uploaded = await uploadAvatarObject(storageKey, fileEntry);
    if (!uploaded.ok) return { ok: false, error: uploaded.error };

    await prisma.user.update({
      where: { id: user.id },
      data: { image: storageKey },
    });
    await deleteAvatarObject(existing?.image);

    await writeAudit({
      actorId: user.id,
      action: "user.avatar.upload",
      entityType: "User",
      entityId: user.id,
    });

    revalidatePath("/dashboard", "layout");
    return { ok: true, data: { hasImage: true } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal mengunggah foto profil"),
    };
  }
}

/** Unggah foto profil keluarga: murid | ayah | ibu. */
export async function uploadStudentAvatar(
  formData: FormData,
): Promise<ActionResult<{ hasImage: true; slot: StudentPhotoSlot }>> {
  try {
    const user = await requireSession();
    const avatarLimit = checkRateLimit(
      `avatar:student:${user.id}`,
      20,
      60 * 60 * 1000,
    );
    if (!avatarLimit.ok) {
      return { ok: false, error: RATE_LIMIT_MESSAGE };
    }

    const studentIdRaw = formData.get("studentId");
    const parsed = studentIdSchema.safeParse({
      studentId: typeof studentIdRaw === "string" ? studentIdRaw : "",
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "ID murid tidak valid",
      };
    }

    const slot = parsePhotoSlot(formData.get("slot")) ?? "murid";

    await assertCanAccessStudent(user, parsed.data.studentId);

    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File)) {
      return { ok: false, error: "File foto wajib diunggah" };
    }
    const validated = validateAvatarFile(fileEntry);
    if (!validated.ok) return { ok: false, error: validated.error };

    const student = await prisma.student.findUnique({
      where: { id: parsed.data.studentId },
      select: {
        id: true,
        status: true,
        imageKey: true,
        fatherImageKey: true,
        motherImageKey: true,
      },
    });
    if (!student) return { ok: false, error: "Murid tidak ditemukan" };

    const storageKey = studentFamilyPhotoKey(student.id, slot, validated.ext);
    const uploaded = await uploadAvatarObject(storageKey, fileEntry);
    if (!uploaded.ok) return { ok: false, error: uploaded.error };

    const previousKey =
      slot === "murid"
        ? student.imageKey
        : slot === "ayah"
          ? student.fatherImageKey
          : student.motherImageKey;

    await prisma.student.update({
      where: { id: student.id },
      data:
        slot === "murid"
          ? { imageKey: storageKey }
          : slot === "ayah"
            ? { fatherImageKey: storageKey }
            : { motherImageKey: storageKey },
    });
    await deleteAvatarObject(previousKey);

    await writeAudit({
      actorId: user.id,
      action: `student.avatar.upload.${SLOT_LABEL[slot]}`,
      entityType: "Student",
      entityId: student.id,
      metadata: { slot },
    });

    revalidatePath(`/dashboard/murid/${student.id}`);
    revalidatePath("/dashboard/murid");
    return { ok: true, data: { hasImage: true, slot } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal mengunggah foto"),
    };
  }
}
