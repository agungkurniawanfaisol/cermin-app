"use server";

import type {
  EvaluationItem,
  Prisma,
  StoryEvaluation,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { toActionError } from "@/lib/action-error";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  assertCanAccessStudent,
  assertCanEditStoryContent,
  AuthzError,
  requireSession,
} from "@/server/policies/access";
import {
  createEvaluationItemSchema,
  createStoryEvaluationSchema,
  deleteEvaluationItemSchema,
  deleteStoryEvaluationSchema,
  updateEvaluationItemSchema,
  updateStoryEvaluationSchema,
  upsertSessionEvaluationResponseSchema,
  upsertStoryEvaluationSchema,
  type CreateStoryEvaluationInput,
  type UpsertSessionEvaluationResponseInput,
  type UpsertStoryEvaluationInput,
} from "@/server/validations/evaluation";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

export type StoryEvaluationWithItems = StoryEvaluation & {
  items: EvaluationItem[];
};

async function loadStoryForEdit(storyId: string) {
  const user = await requireSession();
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true, status: true, createdById: true },
  });
  if (!story) throw new AuthzError("Cerita tidak ditemukan", 404);
  assertCanEditStoryContent(user, story);
  return { user, story };
}

export async function listStoryEvaluations(
  storyId: string,
): Promise<StoryEvaluationWithItems[]> {
  await requireSession();
  return prisma.storyEvaluation.findMany({
    where: { storyId },
    orderBy: { sortOrder: "asc" },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
}

/** Hanya jumlah — untuk progres langkah editor (hindari tarik semua item). */
export async function countStoryEvaluations(storyId: string): Promise<number> {
  await requireSession();
  return prisma.storyEvaluation.count({ where: { storyId } });
}

/**
 * Upsert StoryEvaluation beserta seluruh butir EvaluationItem dalam satu transaksi.
 */
export async function saveStoryEvaluation(
  input: UpsertStoryEvaluationInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = upsertStoryEvaluationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data evaluasi tidak valid",
      };
    }

    const { storyId, evaluationId, title, description, items } = parsed.data;
    const { user } = await loadStoryForEdit(storyId);

    const savedId = await prisma.$transaction(async (tx) => {
      let targetEvalId = evaluationId;

      if (targetEvalId) {
        const existing = await tx.storyEvaluation.findFirst({
          where: { id: targetEvalId, storyId },
          include: { items: true },
        });
        if (!existing) {
          throw new Error("Evaluasi tidak ditemukan");
        }

        await tx.storyEvaluation.update({
          where: { id: targetEvalId },
          data: { title, description: description ?? "" },
        });

        const incomingItemIds = new Set(
          items.filter((it) => it.id).map((it) => it.id!),
        );

        const toDelete = existing.items
          .filter((it) => !incomingItemIds.has(it.id))
          .map((it) => it.id);
        if (toDelete.length > 0) {
          await tx.evaluationItem.deleteMany({
            where: { id: { in: toDelete } },
          });
        }

        for (let i = 0; i < items.length; i++) {
          const item = items[i]!;
          if (item.id && incomingItemIds.has(item.id)) {
            await tx.evaluationItem.update({
              where: { id: item.id },
              data: {
                prompt: item.prompt,
                itemType: item.itemType,
                sortOrder: item.sortOrder ?? i + 1,
              },
            });
          } else {
            await tx.evaluationItem.create({
              data: {
                evaluationId: targetEvalId,
                prompt: item.prompt,
                itemType: item.itemType,
                sortOrder: item.sortOrder ?? i + 1,
              },
            });
          }
        }
      } else {
        const created = await tx.storyEvaluation.create({
          data: {
            storyId,
            title,
            description: description ?? "",
            items: {
              create: items.map((it, idx) => ({
                prompt: it.prompt,
                itemType: it.itemType,
                sortOrder: it.sortOrder ?? idx + 1,
              })),
            },
          },
        });
        targetEvalId = created.id;
      }

      return targetEvalId;
    });

    await writeAudit({
      actorId: user.id,
      action: "evaluation.save",
      entityType: "StoryEvaluation",
      entityId: savedId,
      metadata: { storyId, title, itemCount: items.length },
    });

    revalidatePath(`/dashboard/cerita/${storyId}`);
    return { ok: true, data: { id: savedId } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menyimpan evaluasi"),
    };
  }
}

export async function createStoryEvaluation(
  input: CreateStoryEvaluationInput,
): Promise<ActionResult<StoryEvaluation>> {
  try {
    const parsed = createStoryEvaluationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }
    const { user, story } = await loadStoryForEdit(parsed.data.storyId);

    const maxSort = await prisma.storyEvaluation.aggregate({
      where: { storyId: story.id },
      _max: { sortOrder: true },
    });

    const row = await prisma.storyEvaluation.create({
      data: {
        storyId: story.id,
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    await writeAudit({
      actorId: user.id,
      action: "story.evaluation.create",
      entityType: "StoryEvaluation",
      entityId: row.id,
      metadata: { storyId: story.id },
    });

    revalidatePath(`/dashboard/cerita/${story.id}`);
    return { ok: true, data: row };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal membuat evaluasi"),
    };
  }
}

export async function updateStoryEvaluation(input: {
  evaluationId: string;
  title: string;
  description?: string;
}): Promise<ActionResult<StoryEvaluation>> {
  try {
    const parsed = updateStoryEvaluationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }
    const existing = await prisma.storyEvaluation.findUnique({
      where: { id: parsed.data.evaluationId },
      include: {
        story: { select: { id: true, status: true, createdById: true } },
      },
    });
    if (!existing) throw new AuthzError("Evaluasi tidak ditemukan", 404);
    const user = await requireSession();
    assertCanEditStoryContent(user, existing.story);

    const row = await prisma.storyEvaluation.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? "",
      },
    });

    await writeAudit({
      actorId: user.id,
      action: "story.evaluation.update",
      entityType: "StoryEvaluation",
      entityId: row.id,
      metadata: { storyId: existing.storyId },
    });

    revalidatePath(`/dashboard/cerita/${existing.storyId}`);
    return { ok: true, data: row };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal memperbarui evaluasi"),
    };
  }
}

export async function deleteStoryEvaluation(input: {
  evaluationId: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = deleteStoryEvaluationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }
    const existing = await prisma.storyEvaluation.findUnique({
      where: { id: parsed.data.evaluationId },
      include: {
        story: { select: { id: true, status: true, createdById: true } },
      },
    });
    if (!existing) throw new AuthzError("Evaluasi tidak ditemukan", 404);
    const user = await requireSession();
    assertCanEditStoryContent(user, existing.story);

    await prisma.storyEvaluation.delete({ where: { id: existing.id } });

    await writeAudit({
      actorId: user.id,
      action: "story.evaluation.delete",
      entityType: "StoryEvaluation",
      entityId: existing.id,
      metadata: { storyId: existing.storyId },
    });

    revalidatePath(`/dashboard/cerita/${existing.storyId}`);
    return { ok: true, data: { id: existing.id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menghapus evaluasi"),
    };
  }
}

export async function createEvaluationItem(input: {
  evaluationId: string;
  prompt: string;
  itemType?: "TEXT" | "SCALE";
}): Promise<ActionResult<EvaluationItem>> {
  try {
    const parsed = createEvaluationItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }
    const evaluation = await prisma.storyEvaluation.findUnique({
      where: { id: parsed.data.evaluationId },
      include: {
        story: { select: { id: true, status: true, createdById: true } },
      },
    });
    if (!evaluation) throw new AuthzError("Evaluasi tidak ditemukan", 404);
    const user = await requireSession();
    assertCanEditStoryContent(user, evaluation.story);

    const maxSort = await prisma.evaluationItem.aggregate({
      where: { evaluationId: evaluation.id },
      _max: { sortOrder: true },
    });

    const row = await prisma.evaluationItem.create({
      data: {
        evaluationId: evaluation.id,
        prompt: parsed.data.prompt,
        itemType: parsed.data.itemType ?? "TEXT",
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    await writeAudit({
      actorId: user.id,
      action: "story.evaluation.item.create",
      entityType: "EvaluationItem",
      entityId: row.id,
      metadata: { storyId: evaluation.storyId, evaluationId: evaluation.id },
    });

    revalidatePath(`/dashboard/cerita/${evaluation.storyId}`);
    return { ok: true, data: row };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menambah item evaluasi"),
    };
  }
}

export async function updateEvaluationItem(input: {
  itemId: string;
  prompt: string;
  itemType: "TEXT" | "SCALE";
}): Promise<ActionResult<EvaluationItem>> {
  try {
    const parsed = updateEvaluationItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }
    const item = await prisma.evaluationItem.findUnique({
      where: { id: parsed.data.itemId },
      include: {
        evaluation: {
          include: {
            story: { select: { id: true, status: true, createdById: true } },
          },
        },
      },
    });
    if (!item) throw new AuthzError("Item tidak ditemukan", 404);
    const user = await requireSession();
    assertCanEditStoryContent(user, item.evaluation.story);

    const row = await prisma.evaluationItem.update({
      where: { id: item.id },
      data: {
        prompt: parsed.data.prompt,
        itemType: parsed.data.itemType,
      },
    });

    await writeAudit({
      actorId: user.id,
      action: "story.evaluation.item.update",
      entityType: "EvaluationItem",
      entityId: row.id,
      metadata: { storyId: item.evaluation.storyId },
    });

    revalidatePath(`/dashboard/cerita/${item.evaluation.storyId}`);
    return { ok: true, data: row };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal memperbarui item"),
    };
  }
}

export async function deleteEvaluationItem(input: {
  itemId: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = deleteEvaluationItemSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }
    const item = await prisma.evaluationItem.findUnique({
      where: { id: parsed.data.itemId },
      include: {
        evaluation: {
          include: {
            story: { select: { id: true, status: true, createdById: true } },
          },
        },
      },
    });
    if (!item) throw new AuthzError("Item tidak ditemukan", 404);
    const user = await requireSession();
    assertCanEditStoryContent(user, item.evaluation.story);

    await prisma.evaluationItem.delete({ where: { id: item.id } });

    await writeAudit({
      actorId: user.id,
      action: "story.evaluation.item.delete",
      entityType: "EvaluationItem",
      entityId: item.id,
      metadata: { storyId: item.evaluation.storyId },
    });

    revalidatePath(`/dashboard/cerita/${item.evaluation.storyId}`);
    return { ok: true, data: { id: item.id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menghapus item"),
    };
  }
}

export type SessionEvalItemView = {
  id: string;
  prompt: string;
  itemType: string;
  evaluationTitle: string;
  response: { value: Prisma.JsonValue; note: string | null } | null;
};

export async function listSessionEvaluationItems(
  sessionId: string,
): Promise<SessionEvalItemView[]> {
  const user = await requireSession();
  const session = await prisma.learningSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      ledByUserId: true,
      studentId: true,
      storyId: true,
    },
  });
  if (!session) throw new AuthzError("Sesi tidak ditemukan", 404);
  if (user.role !== "ADMIN" && session.ledByUserId !== user.id) {
    await assertCanAccessStudent(user, session.studentId);
  }

  const evaluations = await prisma.storyEvaluation.findMany({
    where: { storyId: session.storyId },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          responses: {
            where: { sessionId: session.id },
            take: 1,
            select: { value: true, note: true },
          },
        },
      },
    },
  });

  return evaluations.flatMap((ev) =>
    ev.items.map((item) => ({
      id: item.id,
      prompt: item.prompt,
      itemType: item.itemType,
      evaluationTitle: ev.title,
      response: item.responses[0]
        ? {
            value: item.responses[0].value,
            note: item.responses[0].note,
          }
        : null,
    })),
  );
}

export async function upsertSessionEvaluationResponse(
  input: UpsertSessionEvaluationResponseInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = upsertSessionEvaluationResponseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }
    const user = await requireSession();
    const session = await prisma.learningSession.findUnique({
      where: { id: parsed.data.sessionId },
      select: {
        id: true,
        ledByUserId: true,
        studentId: true,
        storyId: true,
        endedAt: true,
      },
    });
    if (!session) throw new AuthzError("Sesi tidak ditemukan", 404);
    if (user.role !== "ADMIN" && session.ledByUserId !== user.id) {
      throw new AuthzError();
    }
    if (session.endedAt) {
      throw new AuthzError("Sesi sudah berakhir");
    }

    const item = await prisma.evaluationItem.findUnique({
      where: { id: parsed.data.evaluationItemId },
      include: { evaluation: { select: { storyId: true } } },
    });
    if (!item || item.evaluation.storyId !== session.storyId) {
      throw new AuthzError("Item evaluasi tidak valid", 404);
    }

    const valueJson = parsed.data.value as Prisma.InputJsonValue;
    const row = await prisma.sessionEvaluationResponse.upsert({
      where: {
        sessionId_evaluationItemId: {
          sessionId: session.id,
          evaluationItemId: item.id,
        },
      },
      create: {
        sessionId: session.id,
        evaluationItemId: item.id,
        value: valueJson,
        note: parsed.data.note ?? null,
      },
      update: {
        value: valueJson,
        note: parsed.data.note ?? null,
      },
    });

    await writeAudit({
      actorId: user.id,
      action: "session.evaluation.response",
      entityType: "SessionEvaluationResponse",
      entityId: row.id,
      metadata: { sessionId: session.id, evaluationItemId: item.id },
    });

    revalidatePath(`/belajar/${session.id}`);
    return { ok: true, data: { id: row.id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menyimpan evaluasi"),
    };
  }
}
