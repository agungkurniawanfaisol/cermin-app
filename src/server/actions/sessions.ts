"use server";

import { cache } from "react";
import { createAvatarSignedUrl } from "@/lib/avatar-storage";
import {
  batchGetCachedSignedUrls,
  batchSetCachedSignedUrls,
} from "@/lib/signed-url-cache";
import { cachedQuery } from "@/lib/server-cache";
import {
  MediaKind,
  Prisma,
  StoryStatus,
  StudentStatus,
  type LearningSession,
  type SessionObservation,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { toActionError } from "@/lib/action-error";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createMcqImagesSignedUrlMap } from "@/lib/mcq-storage";
import {
  resolveStoryCoverMediaId,
  storyCoverMediaWhere,
} from "@/lib/story-cover";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
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
import { listActiveStudentsForSession } from "@/server/actions/students";
import { ensureSessionStudent } from "@/server/sessions/ensure-session-student";
import {
  addObservationSchema,
  sessionIdSchema,
  startLearningSessionSchema,
  updateSessionStudentSchema,
  type AddObservationInput,
  type StartLearningSessionInput,
  type UpdateSessionStudentInput,
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
  description: string;
  categoryId: string;
  categoryName: string;
  categoryDescription: string | null;
  /**
   * @deprecated Cover kategori di-sign di klien via /api/category/[id]/cover.
   * Selalu null dari list — jangan block TTFB dengan N signed URL.
   */
  categoryCoverUrl: string | null;
  pageCount: number;
  /** Cover: prefer IMAGE story-level (pageId null); fallback halaman shared. */
  coverMediaId: string | null;
};

/** Deduped per RSC request — tanpa nested pages + tanpa signed URL storage. */
const fetchPublishedStoriesForSession = async (): Promise<
  PublishedStoryOption[]
> => {
  const stories = await prisma.story.findMany({
    where: { status: StoryStatus.PUBLISHED },
    orderBy: [{ title: "asc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      description: true,
      categoryId: true,
      category: {
        select: { id: true, name: true, description: true, imageKey: true },
      },
      _count: { select: { pages: true } },
      media: {
        where: storyCoverMediaWhere,
        orderBy: { sortOrder: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  });

  const missingCoverStoryIds = stories
    .filter((s) => !s.media[0]?.id)
    .map((s) => s.id);

  const fallbackCoverByStory = new Map<string, string>();
  if (missingCoverStoryIds.length > 0) {
    // Satu baris first-page shared IMAGE per story (Postgres DISTINCT ON).
    const rows = await prisma.$queryRaw<
      Array<{ id: string; story_id: string }>
    >`
      SELECT DISTINCT ON (p."storyId") m.id, p."storyId" AS story_id
      FROM "story_pages" p
      INNER JOIN "media_assets" m ON m."pageId" = p.id
      WHERE p."storyId" IN (${Prisma.join(missingCoverStoryIds)})
        AND m.kind = CAST('IMAGE' AS "MediaKind")
        AND m."studentId" IS NULL
      ORDER BY p."storyId", p."sortOrder" ASC, m."sortOrder" ASC
    `;
    for (const row of rows) {
      fallbackCoverByStory.set(row.story_id, row.id);
    }
  }

  const categoryCoverMap = new Map<string, string>();
  const categoryKeys = Array.from(
    new Set(
      stories
        .map((s) => s.category.imageKey)
        .filter((k): k is string => typeof k === "string" && k.length > 0),
    ),
  );
  if (categoryKeys.length > 0) {
    await Promise.all(
      categoryKeys.map(async (key) => {
        const res = await createAvatarSignedUrl(key);
        if (res.ok) {
          categoryCoverMap.set(key, res.url);
        }
      }),
    );
  }

  return stories.map((story) => ({
    id: story.id,
    title: story.title,
    description: story.description,
    categoryId: story.categoryId,
    categoryName: story.category.name,
    categoryDescription: story.category.description,
    categoryCoverUrl: story.category.imageKey
      ? (categoryCoverMap.get(story.category.imageKey) ?? null)
      : null,
    pageCount: story._count.pages,
    coverMediaId: resolveStoryCoverMediaId({
      storyLevelCoverId: story.media[0]?.id,
      pages: fallbackCoverByStory.has(story.id)
        ? [{ media: [{ id: fallbackCoverByStory.get(story.id)! }] }]
        : [],
    }),
  }));
};

const getCachedPublishedStories = cachedQuery(
  fetchPublishedStoriesForSession,
  ["published-stories-list"],
  { tags: ["published-stories"], revalidate: 300 },
);

/** Deduped per RSC request + cached globally across requests with tag invalidation. */
export const listPublishedStoriesForSession = cache(
  async (): Promise<PublishedStoryOption[]> => {
    await requireSession();
    return getCachedPublishedStories();
  },
);

const getCachedPublishedStoriesCount = cachedQuery(
  async () => {
    return prisma.story.count({ where: { status: StoryStatus.PUBLISHED } });
  },
  ["published-stories-count"],
  { tags: ["published-stories"], revalidate: 300 },
);

/** Hanya boolean/count — jangan tarik katalog penuh untuk kartu entry dasbor. */
export const countPublishedStoriesForSession = cache(
  async (): Promise<number> => {
    await requireSession();
    return getCachedPublishedStoriesCount();
  },
);

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

  let allowedStudentIds: string[] | null = null;
  if (user.role === "TERAPIS") {
    const rows = await prisma.therapistAssignment.findMany({
      where: { therapistId: user.id, endedAt: null },
      select: { studentId: true },
    });
    allowedStudentIds = rows.map((r) => r.studentId);
  } else if (user.role === "ORANG_TUA") {
    const rows = await prisma.parentLink.findMany({
      where: { parentId: user.id, isActive: true },
      select: { studentId: true },
    });
    allowedStudentIds = rows.map((r) => r.studentId);
  }

  if (allowedStudentIds !== null && allowedStudentIds.length === 0) {
    return toListResult(
      [],
      paginationMeta({
        page: parsed.page,
        pageSize: parsed.pageSize,
        total: 0,
      }),
    );
  }

  if (studentId) {
    if (allowedStudentIds !== null && !allowedStudentIds.includes(studentId)) {
      return toListResult(
        [],
        paginationMeta({
          page: parsed.page,
          pageSize: parsed.pageSize,
          total: 0,
        }),
      );
    }
    and.push({ studentId });
  } else if (allowedStudentIds !== null) {
    and.push({ studentId: { in: allowedStudentIds } });
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

  const skip = (Math.max(parsed.page, 1) - 1) * parsed.pageSize;
  const [total, items] = await Promise.all([
    prisma.learningSession.count({ where }),
    prisma.learningSession.findMany({
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

    const [student, story] = await Promise.all([
      prisma.student.findUnique({
        where: { id: parsed.data.studentId },
        select: {
          id: true,
          status: true,
          imageKey: true,
          requirePhotoForSession: true,
        },
      }),
      prisma.story.findUnique({
        where: { id: parsed.data.storyId },
        select: { id: true, status: true },
      }),
    ]);
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

    // Catatan mengikuti nama murid yang dipilih di UI (bukan race state lama).
    await ensureSessionStudent(user, session, parsed.data.studentId);

    const observation = await prisma.sessionObservation.create({
      data: {
        sessionId: parsed.data.sessionId,
        recordedById: user.id,
        note: parsed.data.note,
      },
    });

    revalidatePath(`/belajar/${parsed.data.sessionId}`);
    revalidatePath("/dashboard/sesi");
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

export type SessionMediaRef = {
  id: string;
  altText: string | null;
  sortOrder: number;
  url?: string | null;
};

/** Child-safe MCQ — tanpa correctKey. */
export type SessionPageMcq = {
  id: string;
  prompt: string;
  promptImageUrl: string | null;
  choices: Array<{
    key: string;
    labelText: string;
    imageUrl: string | null;
  }>;
  selectedKey: string | null;
};

export type SessionReaderPage = {
  id: string;
  sortOrder: number;
  bodyText: string;
  /** Foto murid personalisasi untuk murid sesi saat ini. */
  portraitImage: SessionMediaRef | null;
  /**
   * Foto personalisasi per murid (ganti nama tanpa refresh penuh).
   * URL boleh null — klien ambil signed URL via /api/media/[id].
   */
  portraitsByStudentId: Record<string, SessionMediaRef>;
  /** Ilustrasi umum admin (studentId null). */
  storyImages: SessionMediaRef[];
  /** Audio narasi umum (studentId null). */
  storyAudios: SessionMediaRef[];
  /** Soal pilihan opsional (tanpa kunci jawaban). */
  mcq: SessionPageMcq | null;
};

export type SessionForReader = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  student: { id: string; displayName: string };
  /** Murid yang boleh dipilih di child mode (ganti mid-session). */
  studentOptions: Array<{ id: string; displayName: string }>;
  story: { id: string; title: string; categoryName: string };
  /** Cerita terbit untuk ganti cerita mid-session. */
  availableStories: PublishedStoryOption[];
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

  // Unified single-phase query: session with pages, media, mcq, and observations in parallel with user preferences and active students
  const [session, preferenceRow, studentOptionsRaw] = await Promise.all([
    prisma.learningSession.findUnique({
      where: { id: parsed.data.sessionId },
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        studentId: true,
        storyId: true,
        ledByUserId: true,
        student: { select: { id: true, displayName: true } },
        story: {
          select: {
            id: true,
            title: true,
            category: { select: { name: true } },
            pages: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                sortOrder: true,
                bodyText: true,
                media: {
                  orderBy: { sortOrder: "asc" },
                  select: {
                    id: true,
                    kind: true,
                    altText: true,
                    sortOrder: true,
                    studentId: true,
                    storageKey: true,
                    storageBucket: true,
                  },
                },
                mcq: {
                  select: {
                    id: true,
                    prompt: true,
                    promptImageKey: true,
                    choices: {
                      orderBy: { key: "asc" },
                      select: { key: true, labelText: true, imageKey: true },
                    },
                    responses: {
                      where: { sessionId: parsed.data.sessionId },
                      take: 1,
                      select: { selectedKey: true },
                    },
                  },
                },
              },
            },
          },
        },
        observations: {
          orderBy: { recordedAt: "desc" },
          take: 20,
          select: {
            id: true,
            note: true,
            recordedAt: true,
            recordedBy: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.userPreference.findUnique({
      where: { userId: user.id },
      select: { textSize: true, audioEnabled: true },
    }),
    listActiveStudentsForSession(),
  ]);

  if (!session) throw new AuthzError("Sesi tidak ditemukan", 404);
  await assertCanReadSession(user, session);

  const preference = preferenceRow ?? {
    textSize: "MD" as const,
    audioEnabled: true,
  };

  const studentId = session.student.id;
  const pages = session.story.pages;
  const observations = session.observations;
  const availableStories: PublishedStoryOption[] = [];

  const studentOptions = [...studentOptionsRaw];
  // Pastikan murid sesi ada di opsi (mis. status berubah setelah sesi mulai).
  if (!studentOptions.some((s) => s.id === session.student.id)) {
    studentOptions.unshift(session.student);
  }

  // Pre-sign hanya media tampil: shared + portrait murid aktif (+ MCQ batch).
  const mediaToSign = new Map<string, { key: string; bucket: string }>();
  const mcqKeys: string[] = [];

  for (const page of pages) {
    // Urutan deterministik: portrait murid aktif dulu, lalu shared.
    for (const m of page.media) {
      if (m.kind === MediaKind.IMAGE && m.studentId === studentId) {
        mediaToSign.set(m.id, {
          key: m.storageKey,
          bucket: m.storageBucket || "cermin-media",
        });
      }
    }
    for (const m of page.media) {
      if (m.studentId == null) {
        mediaToSign.set(m.id, {
          key: m.storageKey,
          bucket: m.storageBucket || "cermin-media",
        });
      }
    }
    if (page.mcq) {
      if (page.mcq.promptImageKey) mcqKeys.push(page.mcq.promptImageKey);
      for (const c of page.mcq.choices) {
        if (c.imageKey) mcqKeys.push(c.imageKey);
      }
    }
  }

  const signedUrlMap = new Map<string, string>();
  const [mcqUrlMap] = await Promise.all([
    createMcqImagesSignedUrlMap(mcqKeys, 300),
    (async () => {
      if (mediaToSign.size === 0) return;
      try {
        const byBucket = new Map<string, Array<{ id: string; key: string }>>();
        for (const [id, item] of mediaToSign.entries()) {
          const list = byBucket.get(item.bucket) ?? [];
          list.push({ id, key: item.key });
          byBucket.set(item.bucket, list);
        }
        await Promise.all(
          Array.from(byBucket.entries()).map(async ([bucket, items]) => {
            const keys = items.map((x) => x.key);
            const byKey = new Map(items.map((x) => [x.key, x.id]));
            const { hits, misses } = batchGetCachedSignedUrls(bucket, keys);

            for (const [key, url] of hits.entries()) {
              const id = byKey.get(key);
              if (id) signedUrlMap.set(id, url);
            }

            if (misses.length === 0) return;

            const supabase = getSupabaseAdmin();
            const { data, error } = await supabase.storage
              .from(bucket)
              .createSignedUrls(misses, 300);
            if (!error && data) {
              const toCache: Array<{ key: string; url: string }> = [];
              for (let i = 0; i < data.length; i++) {
                const res = data[i] as {
                  signedUrl?: string;
                  path?: string;
                } | null;
                if (!res?.signedUrl) continue;
                const key = res.path ?? misses[i];
                const id = byKey.get(key);
                if (id) signedUrlMap.set(id, res.signedUrl);
                if (key) toCache.push({ key, url: res.signedUrl });
              }
              if (toCache.length > 0) {
                batchSetCachedSignedUrls(bucket, toCache, 300);
              }
            }
          }),
        );
      } catch {
        // klien fallback /api/media/[id]
      }
    })(),
  ]);

  const toRef = (m: {
    id: string;
    altText: string | null;
    sortOrder: number;
  }): SessionMediaRef => ({
    id: m.id,
    altText: m.altText,
    sortOrder: m.sortOrder,
    url: signedUrlMap.get(m.id) ?? null,
  });

  const pagesWithMcq: SessionReaderPage[] = pages.map((page) => {
    const imagesAll = page.media.filter((m) => m.kind === MediaKind.IMAGE);
    const personalized = imagesAll.filter((m) => m.studentId === studentId);
    const shared = imagesAll.filter((m) => m.studentId == null);
    const sharedAudio = page.media.filter(
      (m) => m.kind === MediaKind.AUDIO && m.studentId == null,
    );

    const portraitsByStudentId: Record<string, SessionMediaRef> = {};
    for (const img of imagesAll) {
      if (img.studentId == null) continue;
      const existing = portraitsByStudentId[img.studentId];
      if (!existing || img.sortOrder < existing.sortOrder) {
        portraitsByStudentId[img.studentId] = {
          id: img.id,
          altText: img.altText,
          sortOrder: img.sortOrder,
          url: img.studentId === studentId ? (signedUrlMap.get(img.id) ?? null) : null,
        };
      }
    }

    let mcq: SessionPageMcq | null = null;
    if (page.mcq) {
      mcq = {
        id: page.mcq.id,
        prompt: page.mcq.prompt,
        promptImageUrl: page.mcq.promptImageKey
          ? (mcqUrlMap.get(page.mcq.promptImageKey) ?? null)
          : null,
        choices: page.mcq.choices.map((c) => ({
          key: c.key,
          labelText: c.labelText,
          imageUrl: c.imageKey ? (mcqUrlMap.get(c.imageKey) ?? null) : null,
        })),
        selectedKey: page.mcq.responses[0]?.selectedKey ?? null,
      };
    }

    return {
      id: page.id,
      sortOrder: page.sortOrder,
      bodyText: page.bodyText,
      portraitImage: personalized[0] ? toRef(personalized[0]) : null,
      portraitsByStudentId,
      storyImages: shared.map(toRef),
      storyAudios: sharedAudio.map(toRef),
      mcq,
    };
  });

  return {
    id: session.id,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    student: session.student,
    studentOptions,
    story: {
      id: session.story.id,
      title: session.story.title,
      categoryName: session.story.category.name,
    },
    availableStories,
    pages: pagesWithMcq,
    observations,
    preference,
  };
}

/** Ganti murid pada sesi aktif — foto personalisasi di child mode ikut berubah. */
export async function updateSessionStudent(
  input: UpdateSessionStudentInput,
): Promise<ActionResult<{ sessionId: string; studentId: string }>> {
  try {
    const parsed = updateSessionStudentSchema.safeParse(input);
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
        endedAt: true,
      },
    });
    if (!session) throw new AuthzError("Sesi tidak ditemukan", 404);
    assertCanManageSession(user, session);
    if (session.endedAt) {
      throw new AuthzError("Sesi sudah berakhir");
    }

    if (session.studentId === parsed.data.studentId) {
      return {
        ok: true,
        data: { sessionId: session.id, studentId: session.studentId },
      };
    }

    const [, student] = await Promise.all([
      assertCanLeadSession(user, parsed.data.studentId),
      prisma.student.findFirst({
        where: {
          id: parsed.data.studentId,
          status: StudentStatus.ACTIVE,
        },
        select: { id: true },
      }),
    ]);
    if (!student) {
      return { ok: false, error: "Murid tidak ditemukan atau tidak aktif" };
    }

    await prisma.learningSession.update({
      where: { id: session.id },
      data: { studentId: parsed.data.studentId },
    });

    // Audit + revalidate dasbor di background — UI belajar sudah update lokal.
    void writeAudit({
      actorId: user.id,
      action: "session.student.change",
      entityType: "LearningSession",
      entityId: session.id,
      metadata: {
        fromStudentId: session.studentId,
        toStudentId: parsed.data.studentId,
      },
    });
    revalidatePath("/dashboard/sesi");

    return {
      ok: true,
      data: { sessionId: session.id, studentId: parsed.data.studentId },
    };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal mengganti murid sesi"),
    };
  }
}
