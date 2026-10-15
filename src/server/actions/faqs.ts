"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { toActionError } from "@/lib/action-error";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requireRole, requireSession } from "@/server/policies/access";
import {
  faqIdSchema,
  faqUpsertSchema,
} from "@/server/validations/help";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

export type ListedFaq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
  updatedAt: Date;
};

const listedFaqSelect = {
  id: true,
  question: true,
  answer: true,
  sortOrder: true,
  isPublished: true,
  updatedAt: true,
} satisfies Prisma.FaqItemSelect;

function shortQuestion(q: string) {
  return q.length <= 120 ? q : `${q.slice(0, 117)}...`;
}

export function faqListWhere(role: "ADMIN" | "TERAPIS" | "ORANG_TUA") {
  return role === "ADMIN" ? {} : { isPublished: true as const };
}

export async function listFaqsForViewer(): Promise<ListedFaq[]> {
  const user = await requireSession();
  return prisma.faqItem.findMany({
    where: faqListWhere(user.role),
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: listedFaqSelect,
  });
}

export async function createFaq(
  input: z.infer<typeof faqUpsertSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = faqUpsertSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const faq = await prisma.faqItem.create({
      data: {
        question: parsed.data.question,
        answer: parsed.data.answer,
        sortOrder: parsed.data.sortOrder ?? 0,
        isPublished: parsed.data.isPublished ?? true,
        createdById: admin.id,
      },
      select: { id: true, question: true },
    });

    await writeAudit({
      actorId: admin.id,
      action: "faq.create",
      entityType: "FaqItem",
      entityId: faq.id,
      metadata: { question: shortQuestion(faq.question) },
    });

    revalidatePath("/dashboard/bantuan");
    return { ok: true, data: { id: faq.id } };
  } catch (error) {
    return { ok: false, error: toActionError(error, "Gagal membuat FAQ") };
  }
}

export async function updateFaq(
  input: { id: string } & Partial<z.infer<typeof faqUpsertSchema>>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    const { id, ...fields } = input;
    const idParsed = faqIdSchema.safeParse({ id });
    if (!idParsed.success) {
      return {
        ok: false,
        error: idParsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const bodyParsed = faqUpsertSchema.partial().safeParse(fields);
    if (!bodyParsed.success) {
      return {
        ok: false,
        error: bodyParsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }
    if (Object.keys(bodyParsed.data).length === 0) {
      return { ok: false, error: "Tidak ada perubahan" };
    }

    const existing = await prisma.faqItem.findUnique({
      where: { id: idParsed.data.id },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, error: "FAQ tidak ditemukan" };
    }

    const faq = await prisma.faqItem.update({
      where: { id: idParsed.data.id },
      data: bodyParsed.data,
      select: { id: true, question: true },
    });

    await writeAudit({
      actorId: admin.id,
      action: "faq.update",
      entityType: "FaqItem",
      entityId: faq.id,
      metadata: { question: shortQuestion(faq.question) },
    });

    revalidatePath("/dashboard/bantuan");
    return { ok: true, data: { id: faq.id } };
  } catch (error) {
    return { ok: false, error: toActionError(error, "Gagal memperbarui FAQ") };
  }
}

export async function deleteFaq(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = faqIdSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const existing = await prisma.faqItem.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, question: true },
    });
    if (!existing) {
      return { ok: false, error: "FAQ tidak ditemukan" };
    }

    await prisma.faqItem.delete({ where: { id: existing.id } });

    await writeAudit({
      actorId: admin.id,
      action: "faq.delete",
      entityType: "FaqItem",
      entityId: existing.id,
      metadata: { question: shortQuestion(existing.question) },
    });

    revalidatePath("/dashboard/bantuan");
    return { ok: true, data: { id: existing.id } };
  } catch (error) {
    return { ok: false, error: toActionError(error, "Gagal menghapus FAQ") };
  }
}
