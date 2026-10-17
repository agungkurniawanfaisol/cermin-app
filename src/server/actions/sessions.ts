"use server";

import { cache } from "react";
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
import { createCategoryCoverSignedUrl } from "@/lib/category-storage";
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
  /** Signed URL cover kategori (TTL pendek); null jika belum diunggah. */
  categoryCoverUrl: string | null;
  pageCount: number;
  /** Cover: prefer IMAGE story-level (pageId null); fallback halaman shared. */
  coverMediaId: string | null;
};

/** Deduped per RSC request. */
export const listPublishedStoriesForSession = cache(async (): Promise<
  PublishedStoryOption[]
> => {
  await requireSession();

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
        select: { name: true, description: true, imageKey: true },
      },
      _count: { select: { pages: true } },
      media: {
        where: storyCoverMediaWhere,
        orderBy: { sortOrder: "desc" },
        take: 1,
        select: { id: true },
      },
      pages: {
        orderBy: { sortOrder: "asc" },
        select: {
          media: {
            where: { kind: "IMAGE", studentId: null },
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  });

  const coverByCategory = new Map<string, string | null>();
  await Promise.all(
    [...new Set(stories.map((s) => s.categoryId))].map(async (categoryId) => {
      const key = stories.find((s) => s.categoryId === categoryId)?.category
        .imageKey;
      if (!key) {
        coverByCategory.set(categoryId, null);
        return;
      }
      const signed = await createCategoryCoverSignedUrl(key);
      coverByCategory.set(categoryId, signed.ok ? signed.url : null);
    }),
  );

  return stories.map((story) => ({
    id: story.id,
    title: story.title,
    description: story.description,
    categoryId: story.categoryId,
    categoryName: story.category.name,
    categoryDescription: story.category.description,
    categoryCoverUrl: coverByCategory.get(story.categoryId) ?? null,
    pageCount: story._count.pages,
    coverMediaId: resolveStoryCoverMediaId({
      storyLevelCoverId: story.media[0]?.id,
      pages: story.pages,
    }),
  }));
});

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

export type SessionMediaRef = {
  id: string;
  altText: string | null;
  sortOrder: number;
  url?: string | null;
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

  // Gelombang 1: Ambil data dasar sesi dan preferensi user secara paralel
  const [sessionBase, preferenceRow] = await Promise.all([
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
          },
        },
      },
    }),
    prisma.userPreference.findUnique({
      where: { userId: user.id },
      select: { textSize: true, audioEnabled: true },
    }),
  ]);

  if (!sessionBase) throw new AuthzError("Sesi tidak ditemukan", 404);
  await assertCanReadSession(user, sessionBase);

  const preference = preferenceRow ?? {
    textSize: "MD" as const,
    audioEnabled: true,
  };

  // Gelombang 2: Ambil halaman cerita (+ media), observasi sesi, daftar murid aktif, dan daftar cerita terbit secara paralel
  const [pages, observations, studentOptionsRaw, availableStories] =
    await Promise.all([
    prisma.storyPage.findMany({
      where: { storyId: sessionBase.storyId },
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
      },
    }),
    prisma.sessionObservation.findMany({
      where: { sessionId: sessionBase.id },
      orderBy: { recordedAt: "desc" },
      select: {
        id: true,
        note: true,
        recordedAt: true,
        recordedBy: { select: { id: true, name: true } },
      },
    }),
    listActiveStudentsForSession(),
      listPublishedStoriesForSession(),
  ]);

  const studentOptions = [...studentOptionsRaw];
  // Pastikan murid sesi ada di opsi (mis. status berubah setelah sesi mulai).
  if (!studentOptions.some((s) => s.id === sessionBase.student.id)) {
    studentOptions.unshift(sessionBase.student);
  }

  // Kumpulkan media yang terpilih untuk batch pre-signing signed URLs
  const studentId = sessionBase.student.id;
  const mediaToSign = new Map<string, { key: string; bucket: string }>();

  for (const page of pages) {
    const imagesAll = page.media.filter((m) => m.kind === MediaKind.IMAGE);
    const personalized = imagesAll.filter((m) => m.studentId === studentId);
    const shared = imagesAll.filter((m) => m.studentId == null);
    const sharedAudio = page.media.filter(
      (m) => m.kind === MediaKind.AUDIO && m.studentId == null,
    );

    if (personalized[0]) {
      mediaToSign.set(personalized[0].id, {
        key: personalized[0].storageKey,
        bucket: personalized[0].storageBucket || "cermin-media",
      });
    }
    for (const img of shared) {
      mediaToSign.set(img.id, {
        key: img.storageKey,
        bucket: img.storageBucket || "cermin-media",
      });
    }
    for (const aud of sharedAudio) {
      mediaToSign.set(aud.id, {
        key: aud.storageKey,
        bucket: aud.storageBucket || "cermin-media",
      });
    }
  }

  const signedUrlMap = new Map<string, string>();
  if (mediaToSign.size > 0) {
    try {
      const supabase = getSupabaseAdmin();
      const byBucket = new Map<string, Array<{ id: string; key: string }>>();
      for (const [id, item] of mediaToSign.entries()) {
        const list = byBucket.get(item.bucket) ?? [];
        list.push({ id, key: item.key });
        byBucket.set(item.bucket, list);
      }

      await Promise.all(
        Array.from(byBucket.entries()).map(async ([bucket, items]) => {
          const keys = items.map((x) => x.key);
          const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrls(keys, 300);

          if (!error && data) {
            for (let i = 0; i < data.length; i++) {
              const res = data[i];
              const itemRef = items[i];
              if (res?.signedUrl && itemRef) {
                signedUrlMap.set(itemRef.id, res.signedUrl);
              }
            }
          }
        }),
      );
    } catch {
      // Fallback aman: jika storage API gagal, url tetap null dan klien akan mengambil via /api/media/[id]
    }
  }

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

  return {
    id: sessionBase.id,
    startedAt: sessionBase.startedAt,
    endedAt: sessionBase.endedAt,
    student: sessionBase.student,
    studentOptions,
    story: {
      id: sessionBase.story.id,
      title: sessionBase.story.title,
      categoryName: sessionBase.story.category.name,
    },
    availableStories,
    pages: pages.map((page) => {
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
          // Jangan pre-sign semua murid — hemat round-trip; ganti murid = fetch on demand.
          portraitsByStudentId[img.studentId] = {
            id: img.id,
            altText: img.altText,
            sortOrder: img.sortOrder,
            url:
              img.studentId === studentId
                ? (signedUrlMap.get(img.id) ?? null)
                : null,
          };
        }
      }

      return {
        id: page.id,
        sortOrder: page.sortOrder,
        bodyText: page.bodyText,
        portraitImage: personalized[0] ? toRef(personalized[0]) : null,
        portraitsByStudentId,
        storyImages: shared.map(toRef),
        storyAudios: sharedAudio.map(toRef),
      };
    }),
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
