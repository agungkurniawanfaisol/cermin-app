"use server";

import { revalidatePath } from "next/cache";
import { toActionError } from "@/lib/action-error";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  createMcqImageSignedUrl,
  deleteMcqImageObject,
  pageMcqChoiceKey,
  pageMcqPromptKey,
  uploadMcqImageObject,
  validateMcqImageFile,
} from "@/lib/mcq-storage";
import {
  assertCanAccessStudent,
  assertCanEditStoryContent,
  AuthzError,
  requireSession,
} from "@/server/policies/access";
import { ensureSessionStudent } from "@/server/sessions/ensure-session-student";
import {
  deletePageMcqSchema,
  MCQ_KEY_POOL,
  upsertPageMcqSchema,
  upsertSessionMcqResponseSchema,
  type McqKey,
  type UpsertPageMcqInput,
  type UpsertSessionMcqResponseInput,
} from "@/server/validations/evaluation";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

export type PageMcqChoiceView = {
  key: string;
  labelText: string;
  imageKey: string | null;
  imageUrl: string | null;
};

export type PageMcqEditorView = {
  id: string;
  pageId: string;
  prompt: string;
  promptImageKey: string | null;
  promptImageUrl: string | null;
  correctKey: string;
  choices: PageMcqChoiceView[];
};

/** Child-safe: no correctKey. */
export type PageMcqReaderView = {
  id: string;
  prompt: string;
  promptImageUrl: string | null;
  choices: Array<{
    key: string;
    labelText: string;
    imageUrl: string | null;
  }>;
  /** Existing answer for this session, if any. */
  selectedKey: string | null;
};

export type SessionMcqSummaryRow = {
  pageMcqId: string;
  pageId: string;
  pageSortOrder: number;
  prompt: string;
  correctKey: string;
  selectedKey: string | null;
  choices: Array<{ key: string; labelText: string }>;
};

async function signKey(key: string | null | undefined): Promise<string | null> {
  if (!key) return null;
  const signed = await createMcqImageSignedUrl(key);
  return signed.ok ? signed.url : null;
}

async function loadPageForEdit(pageId: string) {
  const user = await requireSession();
  const page = await prisma.storyPage.findUnique({
    where: { id: pageId },
    select: {
      id: true,
      storyId: true,
      story: { select: { id: true, status: true, createdById: true } },
    },
  });
  if (!page) throw new AuthzError("Halaman tidak ditemukan", 404);
  assertCanEditStoryContent(user, page.story);
  return { user, page };
}

export async function getPageMcq(
  pageId: string,
): Promise<PageMcqEditorView | null> {
  await requireSession();
  const mcq = await prisma.pageMcq.findUnique({
    where: { pageId },
    include: { choices: { orderBy: { key: "asc" } } },
  });
  if (!mcq) return null;

  const promptImageUrl = await signKey(mcq.promptImageKey);
  const choices: PageMcqChoiceView[] = await Promise.all(
    mcq.choices.map(async (c) => ({
      key: c.key,
      labelText: c.labelText,
      imageKey: c.imageKey,
      imageUrl: await signKey(c.imageKey),
    })),
  );

  return {
    id: mcq.id,
    pageId: mcq.pageId,
    prompt: mcq.prompt,
    promptImageKey: mcq.promptImageKey,
    promptImageUrl,
    correctKey: mcq.correctKey,
    choices,
  };
}

export async function upsertPageMcq(
  input: UpsertPageMcqInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = upsertPageMcqSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data soal tidak valid",
      };
    }
    const { pageId, prompt, correctKey, choices, promptImageKey } = parsed.data;
    const { user, page } = await loadPageForEdit(pageId);

    const existing = await prisma.pageMcq.findUnique({
      where: { pageId },
      include: { choices: true },
    });

    const nextPromptKey =
      promptImageKey === undefined
        ? (existing?.promptImageKey ?? null)
        : promptImageKey;

    if (
      existing?.promptImageKey &&
      nextPromptKey !== existing.promptImageKey
    ) {
      await deleteMcqImageObject(existing.promptImageKey);
    }

    const sortedChoices = [...choices]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((c) => {
        const prev = existing?.choices.find((x) => x.key === c.key);
        const nextImage =
          c.imageKey === undefined ? (prev?.imageKey ?? null) : c.imageKey;
        return {
          key: c.key,
          labelText: c.labelText,
          imageKey: nextImage,
          prevImageKey: prev?.imageKey ?? null,
        };
      });

    for (const prev of existing?.choices ?? []) {
      if (!sortedChoices.some((c) => c.key === prev.key) && prev.imageKey) {
        await deleteMcqImageObject(prev.imageKey);
      }
    }
    for (const c of sortedChoices) {
      if (c.prevImageKey && c.imageKey !== c.prevImageKey) {
        await deleteMcqImageObject(c.prevImageKey);
      }
    }

    const savedId = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.pageMcqChoice.deleteMany({ where: { mcqId: existing.id } });
        await tx.pageMcq.update({
          where: { id: existing.id },
          data: {
            prompt,
            correctKey,
            promptImageKey: nextPromptKey,
          },
        });
        await tx.pageMcqChoice.createMany({
          data: sortedChoices.map((c) => ({
            mcqId: existing.id,
            key: c.key,
            labelText: c.labelText,
            imageKey: c.imageKey,
          })),
        });
        return existing.id;
      }

      const created = await tx.pageMcq.create({
        data: {
          pageId,
          prompt,
          correctKey,
          promptImageKey: nextPromptKey,
          choices: {
            create: sortedChoices.map((c) => ({
              key: c.key,
              labelText: c.labelText,
              imageKey: c.imageKey,
            })),
          },
        },
      });
      return created.id;
    });

    await writeAudit({
      actorId: user.id,
      action: "page.mcq.upsert",
      entityType: "PageMcq",
      entityId: savedId,
      metadata: { pageId, storyId: page.storyId },
    });

    revalidatePath(`/dashboard/cerita/${page.storyId}`);
    return { ok: true, data: { id: savedId } };
  } catch (error) {
    return { ok: false, error: toActionError(error, "Gagal menyimpan soal") };
  }
}

export async function deletePageMcq(
  input: { pageId: string },
): Promise<ActionResult<{ pageId: string }>> {
  try {
    const parsed = deletePageMcqSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }
    const { user, page } = await loadPageForEdit(parsed.data.pageId);
    const existing = await prisma.pageMcq.findUnique({
      where: { pageId: parsed.data.pageId },
      include: { choices: true },
    });
    if (!existing) {
      return { ok: true, data: { pageId: parsed.data.pageId } };
    }

    await deleteMcqImageObject(existing.promptImageKey);
    for (const c of existing.choices) {
      await deleteMcqImageObject(c.imageKey);
    }

    await prisma.pageMcq.delete({ where: { id: existing.id } });

    await writeAudit({
      actorId: user.id,
      action: "page.mcq.delete",
      entityType: "PageMcq",
      entityId: existing.id,
      metadata: { pageId: parsed.data.pageId, storyId: page.storyId },
    });

    revalidatePath(`/dashboard/cerita/${page.storyId}`);
    return { ok: true, data: { pageId: parsed.data.pageId } };
  } catch (error) {
    return { ok: false, error: toActionError(error, "Gagal menghapus soal") };
  }
}

export async function uploadPageMcqImage(formData: FormData): Promise<
  ActionResult<{ storageKey: string; url: string }>
> {
  try {
    const pageId = String(formData.get("pageId") ?? "");
    const slot = String(formData.get("slot") ?? "");
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: "File gambar wajib" };
    }
    const valid = validateMcqImageFile(file);
    if (!valid.ok) return { ok: false, error: valid.error };

    const { user, page } = await loadPageForEdit(pageId);

    let storageKey: string;
    if (slot === "prompt") {
      storageKey = pageMcqPromptKey(page.storyId, pageId, valid.ext);
    } else if (MCQ_KEY_POOL.includes(slot as McqKey)) {
      storageKey = pageMcqChoiceKey(page.storyId, pageId, slot, valid.ext);
    } else {
      return { ok: false, error: "Slot gambar tidak valid" };
    }

    const uploaded = await uploadMcqImageObject(storageKey, file);
    if (!uploaded.ok) return { ok: false, error: uploaded.error };

    const signed = await createMcqImageSignedUrl(storageKey);
    if (!signed.ok) {
      return { ok: false, error: signed.error };
    }

    await writeAudit({
      actorId: user.id,
      action: "page.mcq.upsert",
      entityType: "PageMcqImage",
      entityId: pageId,
      metadata: { slot },
    });

    return { ok: true, data: { storageKey, url: signed.url } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal mengunggah gambar soal"),
    };
  }
}

export async function upsertSessionMcqResponse(
  input: UpsertSessionMcqResponseInput,
): Promise<ActionResult<{ id: string; isCorrect: boolean }>> {
  try {
    const parsed = upsertSessionMcqResponseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }
    const user = await requireSession();
    const { sessionId, studentId, pageMcqId, selectedKey } = parsed.data;

    const session = await prisma.learningSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        endedAt: true,
        ledByUserId: true,
        studentId: true,
        storyId: true,
      },
    });
    if (!session) throw new AuthzError("Sesi tidak ditemukan", 404);
    if (session.endedAt) {
      return { ok: false, error: "Sesi sudah berakhir" };
    }
    if (user.role !== "ADMIN" && session.ledByUserId !== user.id) {
      throw new AuthzError();
    }

    await ensureSessionStudent(user, session, studentId);

    const mcq = await prisma.pageMcq.findFirst({
      where: {
        id: pageMcqId,
        page: { storyId: session.storyId },
      },
      select: {
        id: true,
        correctKey: true,
        choices: { select: { key: true } },
      },
    });
    if (!mcq) throw new AuthzError("Soal tidak ditemukan", 404);
    if (!mcq.choices.some((c) => c.key === selectedKey)) {
      return { ok: false, error: "Pilihan tidak valid untuk soal ini" };
    }

    const isCorrect = selectedKey === mcq.correctKey;

    const row = await prisma.sessionMcqResponse.upsert({
      where: {
        sessionId_pageMcqId: { sessionId, pageMcqId },
      },
      create: { sessionId, pageMcqId, selectedKey },
      update: { selectedKey },
      select: { id: true },
    });

    await writeAudit({
      actorId: user.id,
      action: "session.mcq.response",
      entityType: "SessionMcqResponse",
      entityId: row.id,
      metadata: { sessionId, pageMcqId, selectedKey, isCorrect },
    });

    // Jangan revalidate /belajar di sini — agar popup umpan balik di klien tidak hilang.
    return { ok: true, data: { id: row.id, isCorrect } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menyimpan jawaban"),
    };
  }
}

/** Adult summary with correctKey — not for child UI. */
export async function listSessionMcqSummary(
  sessionId: string,
): Promise<SessionMcqSummaryRow[]> {
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

  const mcqs = await prisma.pageMcq.findMany({
    where: { page: { storyId: session.storyId } },
    orderBy: { page: { sortOrder: "asc" } },
    select: {
      id: true,
      prompt: true,
      correctKey: true,
      pageId: true,
      page: { select: { sortOrder: true } },
      choices: {
        orderBy: { key: "asc" },
        select: { key: true, labelText: true },
      },
      responses: {
        where: { sessionId },
        take: 1,
        select: { selectedKey: true },
      },
    },
  });

  return mcqs.map((m) => ({
    pageMcqId: m.id,
    pageId: m.pageId,
    pageSortOrder: m.page.sortOrder,
    prompt: m.prompt,
    correctKey: m.correctKey,
    selectedKey: m.responses[0]?.selectedKey ?? null,
    choices: m.choices,
  }));
}
