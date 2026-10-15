"use server";

import {
  MediaKind,
  StoryStatus,
  StudentStatus,
  type LearningSession,
  type SessionObservation,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  AuthzError,
  assertCanLeadSession,
  requireSession,
} from "@/server/policies/access";
import {
  addObservationSchema,
  sessionIdSchema,
  startLearningSessionSchema,
  type AddObservationInput,
  type StartLearningSessionInput,
} from "@/server/validations/session";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AuthzError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function assertCanManageSession(
  user: { id: string; role: string },
  session: { ledByUserId: string },
): void {
  if (user.role === "ADMIN") return;
  if (session.ledByUserId === user.id) return;
  throw new AuthzError();
}

export type PublishedStoryOption = {
  id: string;
  title: string;
  categoryName: string;
};

export async function listPublishedStoriesForSession(): Promise<
  PublishedStoryOption[]
> {
  await requireSession();

  const stories = await prisma.story.findMany({
    where: { status: StoryStatus.PUBLISHED },
    orderBy: [{ title: "asc" }],
    select: {
      id: true,
      title: true,
      category: { select: { name: true } },
    },
  });

  return stories.map((story) => ({
    id: story.id,
    title: story.title,
    categoryName: story.category.name,
  }));
}

export async function startLearningSession(
  input: StartLearningSessionInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = startLearningSessionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }
    const user = await requireSession();
    await assertCanLeadSession(user, parsed.data.studentId);

    const student = await prisma.student.findUnique({
      where: { id: parsed.data.studentId },
      select: { id: true, status: true },
    });
    if (!student) throw new AuthzError("Murid tidak ditemukan", 404);
    if (student.status !== StudentStatus.ACTIVE) {
      throw new AuthzError("Murid tidak aktif");
    }

    const story = await prisma.story.findUnique({
      where: { id: parsed.data.storyId },
      select: { id: true, status: true },
    });
    if (!story) throw new AuthzError("Cerita tidak ditemukan", 404);
    if (story.status !== StoryStatus.PUBLISHED) {
      throw new AuthzError("Hanya cerita terbit yang dapat dipelajari");
    }

    const session = await prisma.learningSession.create({
      data: {
        studentId: parsed.data.studentId,
        storyId: parsed.data.storyId,
        ledByUserId: user.id,
      },
      select: { id: true },
    });

    await writeAudit({
      actorId: user.id,
      action: "session.start",
      entityType: "LearningSession",
      entityId: session.id,
      metadata: {
        studentId: parsed.data.studentId,
        storyId: parsed.data.storyId,
      },
    });

    revalidatePath("/dashboard/sesi");
    return { ok: true, data: session };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Gagal memulai sesi belajar"),
    };
  }
}

export async function addObservation(
  input: AddObservationInput,
): Promise<ActionResult<SessionObservation>> {
  try {
    const parsed = addObservationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }
    const user = await requireSession();

    const session = await prisma.learningSession.findUnique({
      where: { id: parsed.data.sessionId },
      select: { id: true, ledByUserId: true, endedAt: true },
    });
    if (!session) throw new AuthzError("Sesi tidak ditemukan", 404);
    assertCanManageSession(user, session);
    if (session.endedAt) {
      throw new AuthzError("Sesi sudah berakhir");
    }

    const observation = await prisma.sessionObservation.create({
      data: {
        sessionId: parsed.data.sessionId,
        recordedById: user.id,
        note: parsed.data.note,
      },
    });

    revalidatePath(`/belajar/${parsed.data.sessionId}`);
    return { ok: true, data: observation };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Gagal menyimpan catatan"),
    };
  }
}

export async function endLearningSession(
  input: { sessionId: string },
): Promise<ActionResult<LearningSession>> {
  try {
    const parsed = sessionIdSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }
    const user = await requireSession();

    const session = await prisma.learningSession.findUnique({
      where: { id: parsed.data.sessionId },
    });
    if (!session) throw new AuthzError("Sesi tidak ditemukan", 404);
    assertCanManageSession(user, session);
    if (session.endedAt) {
      throw new AuthzError("Sesi sudah berakhir");
    }

    const updated = await prisma.learningSession.update({
      where: { id: parsed.data.sessionId },
      data: { endedAt: new Date() },
    });

    await writeAudit({
      actorId: user.id,
      action: "session.end",
      entityType: "LearningSession",
      entityId: updated.id,
    });

    revalidatePath(`/belajar/${parsed.data.sessionId}`);
    revalidatePath("/dashboard/sesi");
    return { ok: true, data: updated };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "Gagal mengakhiri sesi"),
    };
  }
}

export type SessionReaderPage = {
  id: string;
  sortOrder: number;
  bodyText: string;
  images: Array<{
    id: string;
    altText: string | null;
    sortOrder: number;
  }>;
  audios: Array<{
    id: string;
    altText: string | null;
    sortOrder: number;
  }>;
};

export type SessionForReader = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  student: { id: string; displayName: string };
  story: { id: string; title: string };
  pages: SessionReaderPage[];
  observations: Array<{
    id: string;
    note: string;
    recordedAt: Date;
    recordedBy: { id: string; name: string };
  }>;
};

export async function getSessionForReader(
  sessionId: string,
): Promise<SessionForReader> {
  const parsed = sessionIdSchema.safeParse({ sessionId });
  if (!parsed.success) throw new AuthzError("Sesi tidak ditemukan", 404);
  const user = await requireSession();

  const session = await prisma.learningSession.findUnique({
    where: { id: parsed.data.sessionId },
    include: {
      student: { select: { id: true, displayName: true } },
      story: {
        select: {
          id: true,
          title: true,
          pages: {
            orderBy: { sortOrder: "asc" },
            include: {
              media: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  kind: true,
                  altText: true,
                  sortOrder: true,
                },
              },
            },
          },
        },
      },
      observations: {
        orderBy: { recordedAt: "desc" },
        select: {
          id: true,
          note: true,
          recordedAt: true,
          recordedBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!session) throw new AuthzError("Sesi tidak ditemukan", 404);
  assertCanManageSession(user, session);

  return {
    id: session.id,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    student: session.student,
    story: { id: session.story.id, title: session.story.title },
    pages: session.story.pages.map((page) => ({
      id: page.id,
      sortOrder: page.sortOrder,
      bodyText: page.bodyText,
      images: page.media
        .filter((m) => m.kind === MediaKind.IMAGE)
        .map((m) => ({
          id: m.id,
          altText: m.altText,
          sortOrder: m.sortOrder,
        })),
      audios: page.media
        .filter((m) => m.kind === MediaKind.AUDIO)
        .map((m) => ({
          id: m.id,
          altText: m.altText,
          sortOrder: m.sortOrder,
        })),
    })),
    observations: session.observations,
  };
}
