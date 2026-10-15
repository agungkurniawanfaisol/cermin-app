"use server";

import {
  MediaKind,
  StoryStatus,
  StudentStatus,
  type LearningSession,
  type Prisma,
  type SessionObservation,
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
  assertCanLeadSession,
  requireSession,
  type PolicyUser,
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

/** End session: Admin or session leader only. */
function assertCanManageSession(
  user: PolicyUser,
  session: { ledByUserId: string },
): void {
  if (user.role === "ADMIN") return;
  if (session.ledByUserId === user.id) return;
  throw new AuthzError();
}

/** Read/observe: Admin, leader, or user with access to the session student. */
async function assertCanReadSession(
  user: PolicyUser,
  session: { ledByUserId: string; studentId: string },
): Promise<void> {
  if (user.role === "ADMIN") return;
  if (session.ledByUserId === user.id) return;
  await assertCanAccessStudent(user, session.studentId);
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
    take: 100,
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

export type ListedSession = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  student: { id: string; displayName: string };
  story: { id: string; title: string };
  ledBy: { id: string; name: string };
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listLearningSessionsForViewer(
  raw: ListQueryInput = {},
): Promise<ListResult<ListedSession>> {
  const user = await requireSession();
  const parsed = parseListQuery(raw, {
    allowedSort: ["startedAt"],
    defaultSort: "startedAt",
    defaultOrder: "desc",
    filters: {
      state: ["OPEN", "ENDED", "ALL"],
    },
  });

  const studentIdRaw =
    typeof raw.studentId === "string" ? raw.studentId.trim() : "";
  const studentId = UUID_RE.test(studentIdRaw) ? studentIdRaw : undefined;

  const and: Prisma.LearningSessionWhereInput[] = [];

  if (user.role === "TERAPIS") {
    and.push({
      student: {
        therapistAssignments: {
          some: { therapistId: user.id, endedAt: null },
        },
      },
    });
  } else if (user.role === "ORANG_TUA") {
    and.push({
      student: {
        parentLinks: {
          some: { parentId: user.id, isActive: true },
        },
      },
    });
  }

  if (parsed.filters.state === "OPEN") {
    and.push({ endedAt: null });
  } else if (parsed.filters.state === "ENDED") {
    and.push({ endedAt: { not: null } });
  }

  if (studentId) {
    // Scoped by role relation filters above — unknown/unlinked id → empty list.
    and.push({ studentId });
  }

  if (parsed.q) {
    and.push({
      OR: [
        {
          student: {
            displayName: { contains: parsed.q, mode: "insensitive" },
          },
        },
        { story: { title: { contains: parsed.q, mode: "insensitive" } } },
        { ledBy: { name: { contains: parsed.q, mode: "insensitive" } } },
      ],
    });
  }

  const where: Prisma.LearningSessionWhereInput =
    and.length === 0 ? {} : { AND: and };

  const total = await prisma.learningSession.count({ where });
  const meta = paginationMeta({
    page: parsed.page,
    pageSize: parsed.pageSize,
    total,
  });

  const items = await prisma.learningSession.findMany({
    where,
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      student: { select: { id: true, displayName: true } },
      story: { select: { id: true, title: true } },
      ledBy: { select: { id: true, name: true } },
    },
    orderBy: { startedAt: parsed.order },
    skip: meta.skip,
    take: meta.take,
  });

  return toListResult(items, meta);
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
      select: {
        id: true,
        status: true,
        imageKey: true,
        requirePhotoForSession: true,
      },
    });
    if (!student) throw new AuthzError("Murid tidak ditemukan", 404);
    if (student.status !== StudentStatus.ACTIVE) {
      throw new AuthzError("Murid tidak aktif");
    }
    if (student.requirePhotoForSession && !student.imageKey) {
      return {
        ok: false,
        error:
          "Murid ini wajib punya foto profil sebelum sesi. Unggah foto di halaman detail murid.",
      };
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
      error: toActionError(error, "Gagal memulai sesi belajar"),
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
      select: { id: true, ledByUserId: true, studentId: true, endedAt: true },
    });
    if (!session) throw new AuthzError("Sesi tidak ditemukan", 404);
    await assertCanReadSession(user, session);
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
      error: toActionError(error, "Gagal menyimpan catatan"),
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
      error: toActionError(error, "Gagal mengakhiri sesi"),
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
  /** Preferensi pemandu sesi (ukuran teks + sakelar audio). */
  preference: {
    textSize: "SM" | "MD" | "LG" | "XL";
    audioEnabled: boolean;
  };
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
  await assertCanReadSession(user, session);

  const preferenceRow = await prisma.userPreference.findUnique({
    where: { userId: user.id },
    select: { textSize: true, audioEnabled: true },
  });
  const preference = preferenceRow ?? {
    textSize: "MD" as const,
    audioEnabled: true,
  };

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
    preference,
  };
}
