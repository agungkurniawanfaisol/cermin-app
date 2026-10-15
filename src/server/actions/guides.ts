"use server";

import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { toActionError } from "@/lib/action-error";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireRole, requireSession } from "@/server/policies/access";
import {
  assertValidGuideFile,
  guideIdSchema,
  guideMetaSchema,
  GUIDE_MIME,
} from "@/server/validations/help";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

export type ListedGuide = {
  id: string;
  title: string;
  sortOrder: number;
  isPublished: boolean;
  originalFileName: string;
  byteSize: number;
  updatedAt: Date;
};

const BUCKET = "cermin-media";

const listedGuideSelect = {
  id: true,
  title: true,
  sortOrder: true,
  isPublished: true,
  originalFileName: true,
  byteSize: true,
  updatedAt: true,
} satisfies Prisma.GuideDocumentSelect;

function formString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function guideListWhere(role: "ADMIN" | "TERAPIS" | "ORANG_TUA") {
  return role === "ADMIN" ? {} : { isPublished: true as const };
}

export async function listGuidesForViewer(): Promise<ListedGuide[]> {
  const user = await requireSession();
  return prisma.guideDocument.findMany({
    where: guideListWhere(user.role),
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: listedGuideSelect,
  });
}

export async function uploadGuide(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireRole("ADMIN");

    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File) || fileEntry.size === 0) {
      return { ok: false, error: "File PDF wajib diunggah" };
    }

    const meta = guideMetaSchema.safeParse({
      title: formString(formData.get("title")) ?? "",
      sortOrder: formString(formData.get("sortOrder")),
      isPublished:
        formData.get("isPublished") === "true"
          ? true
          : formData.get("isPublished") === "false"
            ? false
            : undefined,
    });
    if (!meta.success) {
      return {
        ok: false,
        error: meta.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const fileError = assertValidGuideFile({
      type: fileEntry.type,
      size: fileEntry.size,
      name: fileEntry.name,
    });
    if (fileError) {
      return { ok: false, error: fileError };
    }

    const id = randomUUID();
    const storageKey = `guides/${id}.pdf`;
    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storageKey, buffer, {
        contentType: GUIDE_MIME,
        upsert: false,
      });

    if (uploadError) {
      return { ok: false, error: "Gagal mengunggah petunjuk" };
    }

    try {
      await prisma.guideDocument.create({
        data: {
          id,
          title: meta.data.title,
          sortOrder: meta.data.sortOrder ?? 0,
          isPublished: meta.data.isPublished ?? true,
          storageBucket: BUCKET,
          storageKey,
          mimeType: GUIDE_MIME,
          byteSize: fileEntry.size,
          originalFileName: fileEntry.name,
          uploadedById: admin.id,
        },
      });
    } catch (dbError) {
      await supabase.storage.from(BUCKET).remove([storageKey]);
      throw dbError;
    }

    await writeAudit({
      actorId: admin.id,
      action: "guide.upload",
      entityType: "GuideDocument",
      entityId: id,
      metadata: { title: meta.data.title },
    });

    revalidatePath("/dashboard/bantuan");
    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal mengunggah petunjuk"),
    };
  }
}

export async function updateGuideMeta(
  input: { id: string } & Partial<z.infer<typeof guideMetaSchema>>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    const { id, ...fields } = input;
    const idParsed = guideIdSchema.safeParse({ id });
    if (!idParsed.success) {
      return {
        ok: false,
        error: idParsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const bodyParsed = guideMetaSchema.partial().safeParse(fields);
    if (!bodyParsed.success) {
      return {
        ok: false,
        error: bodyParsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }
    if (Object.keys(bodyParsed.data).length === 0) {
      return { ok: false, error: "Tidak ada perubahan" };
    }

    const existing = await prisma.guideDocument.findUnique({
      where: { id: idParsed.data.id },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, error: "Petunjuk tidak ditemukan" };
    }

    const guide = await prisma.guideDocument.update({
      where: { id: idParsed.data.id },
      data: bodyParsed.data,
      select: { id: true, title: true },
    });

    await writeAudit({
      actorId: admin.id,
      action: "guide.update",
      entityType: "GuideDocument",
      entityId: guide.id,
      metadata: { title: guide.title },
    });

    revalidatePath("/dashboard/bantuan");
    return { ok: true, data: { id: guide.id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal memperbarui petunjuk"),
    };
  }
}

export async function deleteGuide(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = guideIdSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const existing = await prisma.guideDocument.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        title: true,
        storageBucket: true,
        storageKey: true,
      },
    });
    if (!existing) {
      return { ok: false, error: "Petunjuk tidak ditemukan" };
    }

    const supabase = getSupabaseAdmin();
    await supabase.storage
      .from(existing.storageBucket)
      .remove([existing.storageKey]);

    await prisma.guideDocument.delete({ where: { id: existing.id } });

    await writeAudit({
      actorId: admin.id,
      action: "guide.delete",
      entityType: "GuideDocument",
      entityId: existing.id,
      metadata: { title: existing.title },
    });

    revalidatePath("/dashboard/bantuan");
    return { ok: true, data: { id: existing.id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menghapus petunjuk"),
    };
  }
}
