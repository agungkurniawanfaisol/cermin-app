"use server";

import {
  StoryStatus,
  type Prisma,
  type Story,
  type StoryPage,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { toActionError } from "@/lib/action-error";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  resolveStoryCoverMediaId,
  storyCoverMediaWhere,
} from "@/lib/story-cover";
import {
  paginationMeta,
  parseListQuery,
  toListResult,
  type ListQueryInput,
  type ListResult,
} from "@/lib/list-query";
import {
  AuthzError,
  assertCanEditStoryContent,
  canUserTransitionStoryStatus,
  requireRole,
  requireSession,
} from "@/server/policies/access";
import {
  archiveStorySchema,
  createPageSchema,
  createStorySchema,
  pageIdSchema,
  publishSnapshotSchema,
  reorderPagesSchema,
  restoreStoryVersionSchema,
  storyIdSchema,
  transitionStoryStatusSchema,
  updatePageSchema,
  updateStorySchema,
  type ArchiveStoryInput,
  type CreatePageInput,
  type CreateStoryInput,
  type ReorderPagesInput,
  type RestoreStoryVersionInput,
  type TransitionStoryStatusInput,
  type UpdatePageInput,
  type UpdateStoryInput,
} from "@/server/validations/story";

export type ActionOk<T> = { ok: true; data: T };
export type ActionErr = { ok: false; error: string };
export type ActionResult<T> = ActionOk<T> | ActionErr;

function revalidateStoryPaths(storyId?: string): void {
  revalidatePath("/dashboard/cerita");
  if (storyId) revalidatePath(`/dashboard/cerita/${storyId}`);
}

export type ListedCategory = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  stories: Array<{
    id: string;
    title: string;
    status: StoryStatus;
    publishedAt: Date | null;
    updatedAt: Date;
    createdBy: { id: string; name: string };
  }>;
};

/** @deprecated Prefer listStoriesForViewer for paginated dashboard lists. */
export async function listStoriesByCategory(): Promise<ListedCategory[]> {
  const user = await requireSession();

  const statusFilter =
    user.role === "ORANG_TUA"
      ? { status: StoryStatus.PUBLISHED }
      : undefined;

  const categories = await prisma.storyCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      stories: {
        where: statusFilter,
        orderBy: [{ updatedAt: "desc" }],
        select: {
          id: true,
          title: true,
          status: true,
          publishedAt: true,
          updatedAt: true,
          createdBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  return categories;
}

export type ListedStory = {
  id: string;
  title: string;
  description: string;
  status: StoryStatus;
  publishedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  pageCount: number;
  category: { id: string; name: string };
  createdBy: { id: string; name: string };
  archivedReason: string | null;
  archivedAt: Date | null;
  archivedBy: { id: string; name: string } | null;
};

/** Ringkasan untuk sheet detail/pratinjau di daftar cerita. */
export type StoryListPreview = {
  id: string;
  title: string;
  description: string;
  learningObjectives: string;
  status: StoryStatus;
  updatedAt: string;
  pageCount: number;
  category: { id: string; name: string };
  createdBy: { id: string; name: string };
  pages: Array<{ id: string; sortOrder: number; excerpt: string }>;
  coverMediaId: string | null;
};

function excerptText(text: string, max = 120): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

const STORY_STATUSES = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
  "ALL",
] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listStoriesForViewer(
  raw: ListQueryInput = {},
): Promise<ListResult<ListedStory>> {
  const user = await requireSession();
  const parsed = parseListQuery(raw, {
    allowedSort: ["title", "updatedAt", "createdAt"],
    defaultSort: "updatedAt",
    defaultOrder: "desc",
    filters: {
      status: STORY_STATUSES,
    },
  });

  const categoryIdRaw =
    typeof raw.categoryId === "string" ? raw.categoryId.trim() : "";
  const categoryId = UUID_RE.test(categoryIdRaw) ? categoryIdRaw : undefined;

  const and: Prisma.StoryWhereInput[] = [];

  if (user.role === "ORANG_TUA") {
    and.push({ status: StoryStatus.PUBLISHED });
  } else if (
    parsed.filters.status &&
    parsed.filters.status !== "ALL"
  ) {
    and.push({ status: parsed.filters.status as StoryStatus });
  }

  if (categoryId) {
    and.push({ categoryId });
  }

  if (parsed.q) {
    and.push({
      OR: [
        { title: { contains: parsed.q, mode: "insensitive" } },
        { description: { contains: parsed.q, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.StoryWhereInput =
    and.length === 0 ? {} : { AND: and };

  const orderBy: Prisma.StoryOrderByWithRelationInput =
    parsed.sort === "title"
      ? { title: parsed.order }
      : parsed.sort === "createdAt"
        ? { createdAt: parsed.order }
        : { updatedAt: parsed.order };

  const skip = (Math.max(parsed.page, 1) - 1) * parsed.pageSize;
  const [total, rows] = await Promise.all([
    prisma.story.count({ where }),
    prisma.story.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
        createdAt: true,
        archivedReason: true,
        archivedAt: true,
        category: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        archivedBy: { select: { id: true, name: true } },
        _count: { select: { pages: true } },
      },
      orderBy,
      skip,
      take: parsed.pageSize,
    }),
  ]);
  const items: ListedStory[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    pageCount: row._count.pages,
    category: row.category,
    createdBy: row.createdBy,
    archivedReason: row.archivedReason,
    archivedAt: row.archivedAt,
    archivedBy: row.archivedBy,
  }));
  const meta = paginationMeta({
    page: parsed.page,
    pageSize: parsed.pageSize,
    total,
  });

  return toListResult(items, meta);
}

/**
 * Detail ringkas untuk sheet daftar cerita (metadata + cuplikan halaman + cover).
 * Authz sama akses daftar: ortu hanya published.
 */
export async function getStoryListPreview(
  storyId: string,
): Promise<StoryListPreview> {
  const user = await requireSession();
  const parsed = storyIdSchema.safeParse({ storyId });
  if (!parsed.success) {
    throw new AuthzError(
      parsed.error.issues[0]?.message ?? "ID cerita tidak valid",
      400,
    );
  }

  const story = await prisma.story.findUnique({
    where: { id: parsed.data.storyId },
    select: {
      id: true,
      title: true,
      description: true,
      learningObjectives: true,
      status: true,
      updatedAt: true,
      category: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      media: {
        where: storyCoverMediaWhere,
        orderBy: { sortOrder: "desc" },
        take: 1,
        select: { id: true },
      },
      pages: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sortOrder: true,
          title: true,
          bodyText: true,
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

  if (!story) throw new AuthzError("Cerita tidak ditemukan", 404);
  if (user.role === "ORANG_TUA" && story.status !== StoryStatus.PUBLISHED) {
    throw new AuthzError();
  }

  const coverMediaId = resolveStoryCoverMediaId({
    storyLevelCoverId: story.media[0]?.id,
    pages: story.pages,
  });

  return {
    id: story.id,
    title: story.title,
    description: story.description,
    learningObjectives: story.learningObjectives,
    status: story.status,
    updatedAt: story.updatedAt.toISOString(),
    pageCount: story.pages.length,
    category: story.category,
    createdBy: story.createdBy,
    pages: story.pages.map((p) => ({
      id: p.id,
      sortOrder: p.sortOrder,
      excerpt: excerptText(
        p.title.trim() || p.bodyText || "(Belum ada teks)",
      ),
    })),
    coverMediaId,
  };
}

export type StoryPageMedia = {
  id: string;
  kind: string;
  mimeType: string;
  altText: string | null;
  sortOrder: number;
  studentId: string | null;
  student: { id: string; displayName: string } | null;
};

export type StoryPageMcqChoice = {
  id: string;
  key: string;
  labelText: string;
  imageKey: string | null;
};

export type StoryPageMcq = {
  id: string;
  prompt: string;
  promptImageKey: string | null;
  correctKey: string;
  choices: StoryPageMcqChoice[];
};

export type StoryDetail = Story & {
  category: { id: string; name: string };
  createdBy: { id: string; name: string; email: string };
  pages: Array<
    StoryPage & {
      media: StoryPageMedia[];
      mcq: StoryPageMcq | null;
    }
  >;
};

/** Shell ringan untuk header + progres langkah (tanpa media penuh). */
export type StoryEditorShell = {
  id: string;
  title: string;
  description: string;
  learningObjectives: string;
  categoryId: string;
  status: StoryStatus;
  createdById: string;
  updatedAt: Date;
  category: { id: string; name: string };
  createdBy: { id: string; name: string; email: string };
  pageCount: number;
  pagesWithText: number;
  pagesWithMedia: number;
  /** IMAGE story-level (pageId null) — gambar utama admin. */
  coverMediaId: string | null;
  archivedReason: string | null;
};

export async function getStoryEditorShell(
  storyId: string,
): Promise<StoryEditorShell> {
  const user = await requireSession();
  const parsed = storyIdSchema.safeParse({ storyId });
  if (!parsed.success) {
    throw new AuthzError(
      parsed.error.issues[0]?.message ?? "ID cerita tidak valid",
      400,
    );
  }

  const validStoryId = parsed.data.storyId;
  const [story, pagesWithTextRows, pagesWithMedia] = await Promise.all([
    prisma.story.findUnique({
      where: { id: validStoryId },
      select: {
        id: true,
        title: true,
        description: true,
        learningObjectives: true,
        categoryId: true,
        status: true,
        createdById: true,
        updatedAt: true,
        archivedReason: true,
        category: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        media: {
          where: storyCoverMediaWhere,
          orderBy: { sortOrder: "desc" },
          take: 1,
          select: { id: true },
        },
        _count: { select: { pages: true } },
      },
    }),
    prisma.$queryRaw<Array<{ c: bigint }>>`
      SELECT COUNT(*)::bigint AS c
      FROM "story_pages"
      WHERE "storyId" = ${validStoryId}
        AND length(trim("bodyText")) > 0
    `,
    prisma.storyPage.count({
      where: {
        storyId: validStoryId,
        media: { some: {} },
      },
    }),
  ]);

  if (!story) throw new AuthzError("Cerita tidak ditemukan", 404);
  if (user.role === "ORANG_TUA" && story.status !== StoryStatus.PUBLISHED) {
    throw new AuthzError();
  }

  const pagesWithText = Number(pagesWithTextRows[0]?.c ?? 0);
  return {
    id: story.id,
    title: story.title,
    description: story.description,
    learningObjectives: story.learningObjectives,
    categoryId: story.categoryId,
    status: story.status,
    createdById: story.createdById,
    updatedAt: story.updatedAt,
    category: story.category,
    createdBy: story.createdBy,
    pageCount: story._count.pages,
    pagesWithText,
    pagesWithMedia,
    coverMediaId: story.media[0]?.id ?? null,
    archivedReason: story.archivedReason,
  };
}

export async function getStoryDetail(storyId: string): Promise<StoryDetail> {
  const user = await requireSession();
  const parsed = storyIdSchema.safeParse({ storyId });
  if (!parsed.success) {
    throw new AuthzError(
      parsed.error.issues[0]?.message ?? "ID cerita tidak valid",
      400,
    );
  }

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: {
      category: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      pages: {
        orderBy: { sortOrder: "asc" },
        include: {
          media: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              kind: true,
              mimeType: true,
              altText: true,
              sortOrder: true,
              studentId: true,
              student: { select: { id: true, displayName: true } },
            },
          },
          mcq: {
            select: {
              id: true,
              prompt: true,
              promptImageKey: true,
              correctKey: true,
              choices: {
                orderBy: { key: "asc" },
                select: {
                  id: true,
                  key: true,
                  labelText: true,
                  imageKey: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!story) throw new AuthzError("Cerita tidak ditemukan", 404);

  if (user.role === "ORANG_TUA" && story.status !== StoryStatus.PUBLISHED) {
    throw new AuthzError();
  }

  return story;
}

export async function listActiveCategories(): Promise<
  Array<{ id: string; name: string }>
> {
  await requireRole("ADMIN", "TERAPIS");
  return prisma.storyCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
}

/** Kategori aktif untuk filter daftar (semua peran yang sudah login). */
export async function listCategoriesForFilter(): Promise<
  Array<{ id: string; name: string }>
> {
  await requireSession();
  return prisma.storyCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * Daftar murid aktif untuk dropdown uploader media personalisasi di cerita.
 * ADMIN: seluruh murid aktif.
 * TERAPIS: murid aktif dengan penugasan terapis aktif (endedAt: null).
 */
export async function listStudentsForStoryUpload(): Promise<
  Array<{ id: string; displayName: string }>
> {
  const user = await requireRole("ADMIN", "TERAPIS");

  if (user.role === "ADMIN") {
    return prisma.student.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    });
  }

  return prisma.student.findMany({
    where: {
      status: "ACTIVE",
      therapistAssignments: {
        some: {
          therapistId: user.id,
          endedAt: null,
        },
      },
    },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
  });
}

export async function createStory(
  input: CreateStoryInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireRole("ADMIN", "TERAPIS");
    const parsed = createStorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const category = await prisma.storyCategory.findFirst({
      where: { id: parsed.data.categoryId, isActive: true },
    });
    if (!category) {
      return { ok: false, error: "Kategori tidak ditemukan" };
    }

    const story = await prisma.story.create({
      data: {
        categoryId: parsed.data.categoryId,
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        learningObjectives: parsed.data.learningObjectives ?? "",
        status: StoryStatus.DRAFT,
        createdById: user.id,
      },
    });

    await writeAudit({
      actorId: user.id,
      action: "story.create",
      entityType: "Story",
      entityId: story.id,
      metadata: { title: story.title, categoryId: story.categoryId },
    });

    revalidateStoryPaths(story.id);
    return { ok: true, data: { id: story.id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal membuat cerita"),
    };
  }
}

export async function updateStory(
  input: UpdateStoryInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireRole("ADMIN", "TERAPIS");
    const parsed = updateStorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const existing = await prisma.story.findUnique({
      where: { id: parsed.data.id },
    });
    if (!existing) {
      return { ok: false, error: "Cerita tidak ditemukan" };
    }
    assertCanEditStoryContent(user, existing);

    if (parsed.data.categoryId) {
      const category = await prisma.storyCategory.findFirst({
        where: { id: parsed.data.categoryId, isActive: true },
      });
      if (!category) {
        return { ok: false, error: "Kategori tidak ditemukan" };
      }
    }

    const { id, ...rest } = parsed.data;
    await prisma.story.update({
      where: { id },
      data: {
        ...(rest.categoryId !== undefined
          ? { categoryId: rest.categoryId }
          : {}),
        ...(rest.title !== undefined ? { title: rest.title } : {}),
        ...(rest.description !== undefined
          ? { description: rest.description }
          : {}),
        ...(rest.learningObjectives !== undefined
          ? { learningObjectives: rest.learningObjectives }
          : {}),
      },
    });

    await writeAudit({
      actorId: user.id,
      action: "story.update",
      entityType: "Story",
      entityId: id,
      metadata: { title: rest.title ?? existing.title },
    });

    revalidateStoryPaths(id);
    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal memperbarui cerita"),
    };
  }
}

export async function createStoryPage(
  input: CreatePageInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireRole("ADMIN", "TERAPIS");
    const parsed = createPageSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const story = await prisma.story.findUnique({
      where: { id: parsed.data.storyId },
      include: { pages: { select: { sortOrder: true } } },
    });
    if (!story) {
      return { ok: false, error: "Cerita tidak ditemukan" };
    }
    assertCanEditStoryContent(user, story);

    const nextOrder =
      story.pages.length === 0
        ? 0
        : Math.max(...story.pages.map((p) => p.sortOrder)) + 1;

    const page = await prisma.storyPage.create({
      data: {
        storyId: story.id,
        sortOrder: nextOrder,
        title: parsed.data.title ?? "",
        bodyText: parsed.data.bodyText ?? "",
      },
    });

    await writeAudit({
      actorId: user.id,
      action: "story.page.create",
      entityType: "StoryPage",
      entityId: page.id,
      metadata: { storyId: story.id, sortOrder: nextOrder },
    });

    // Tanpa revalidate detail: soft-refresh RSC me-remount PagesEditor
    // dan item halaman sebelumnya hilang dari UI. List lokal di klien cukup.
    return { ok: true, data: { id: page.id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menambah halaman"),
    };
  }
}

export async function updateStoryPage(
  input: UpdatePageInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireRole("ADMIN", "TERAPIS");
    const parsed = updatePageSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const page = await prisma.storyPage.findUnique({
      where: { id: parsed.data.pageId },
      include: { story: true },
    });
    if (!page) {
      return { ok: false, error: "Halaman tidak ditemukan" };
    }
    assertCanEditStoryContent(user, page.story);

    await prisma.storyPage.update({
      where: { id: page.id },
      data: {
        title: parsed.data.title,
        bodyText: parsed.data.bodyText,
      },
    });

    // Editor detail pakai state lokal — jangan remount via revalidate.
    return { ok: true, data: { id: page.id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal memperbarui halaman"),
    };
  }
}

export async function deleteStoryPage(
  pageId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireRole("ADMIN", "TERAPIS");
    const parsed = pageIdSchema.safeParse({ pageId });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const page = await prisma.storyPage.findUnique({
      where: { id: pageId },
      include: { story: true },
    });
    if (!page) {
      return { ok: false, error: "Halaman tidak ditemukan" };
    }
    assertCanEditStoryContent(user, page.story);

    await prisma.$transaction(async (tx) => {
      await tx.storyPage.delete({ where: { id: page.id } });
      const remaining = await tx.storyPage.findMany({
        where: { storyId: page.storyId },
        orderBy: { sortOrder: "asc" },
      });
      // Normalize sortOrder to 0..n-1 without unique conflicts
      for (let i = 0; i < remaining.length; i++) {
        await tx.storyPage.update({
          where: { id: remaining[i]!.id },
          data: { sortOrder: i + 1000 },
        });
      }
      for (let i = 0; i < remaining.length; i++) {
        await tx.storyPage.update({
          where: { id: remaining[i]!.id },
          data: { sortOrder: i },
        });
      }
    });

    await writeAudit({
      actorId: user.id,
      action: "story.page.delete",
      entityType: "StoryPage",
      entityId: pageId,
      metadata: { storyId: page.storyId },
    });

    // State list di PagesEditor; hindari remount detail.
    return { ok: true, data: { id: pageId } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menghapus halaman"),
    };
  }
}

export async function reorderStoryPages(
  input: ReorderPagesInput,
): Promise<ActionResult<{ storyId: string }>> {
  try {
    const user = await requireRole("ADMIN", "TERAPIS");
    const parsed = reorderPagesSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const story = await prisma.story.findUnique({
      where: { id: parsed.data.storyId },
      include: { pages: { select: { id: true } } },
    });
    if (!story) {
      return { ok: false, error: "Cerita tidak ditemukan" };
    }
    assertCanEditStoryContent(user, story);

    const existingIds = new Set(story.pages.map((p) => p.id));
    if (
      parsed.data.pageIds.length !== existingIds.size ||
      parsed.data.pageIds.some((id) => !existingIds.has(id))
    ) {
      return {
        ok: false,
        error: "Daftar halaman tidak sesuai dengan cerita",
      };
    }

    await prisma.$transaction(async (tx) => {
      // Two-pass to avoid unique (storyId, sortOrder) conflicts
      for (let i = 0; i < parsed.data.pageIds.length; i++) {
        await tx.storyPage.update({
          where: { id: parsed.data.pageIds[i]! },
          data: { sortOrder: i + 1000 },
        });
      }
      for (let i = 0; i < parsed.data.pageIds.length; i++) {
        await tx.storyPage.update({
          where: { id: parsed.data.pageIds[i]! },
          data: { sortOrder: i },
        });
      }
    });

    // Urutan sudah di state klien; jangan remount detail.
    return { ok: true, data: { storyId: story.id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal mengurutkan halaman"),
    };
  }
}

type SnapshotMcq = {
  prompt: string;
  promptImageKey: string | null;
  correctKey: string;
  choices: Array<{
    key: string;
    labelText: string;
    imageKey: string | null;
  }>;
};

type SnapshotPage = {
  id: string;
  sortOrder: number;
  title: string;
  bodyText: string;
  media: Array<{
    id: string;
    kind: string;
    mimeType: string;
    altText: string | null;
    sortOrder: number;
    storageKey: string;
    studentId: string | null;
  }>;
  mcq: SnapshotMcq | null;
};

function buildPublishSnapshot(story: {
  title: string;
  description: string;
  learningObjectives: string;
  pages: SnapshotPage[];
}): Prisma.InputJsonValue {
  return {
    title: story.title,
    description: story.description,
    learningObjectives: story.learningObjectives,
    pages: story.pages.map((p) => ({
      id: p.id,
      sortOrder: p.sortOrder,
      title: p.title,
      bodyText: p.bodyText,
      // Snapshot hanya media shared (studentId null) + MCQ.
      media: p.media
        .filter((m) => m.studentId == null)
        .map((m) => ({
          id: m.id,
          kind: m.kind,
          mimeType: m.mimeType,
          altText: m.altText,
          sortOrder: m.sortOrder,
          storageKey: m.storageKey,
        })),
      mcq: p.mcq
        ? {
            prompt: p.mcq.prompt,
            promptImageKey: p.mcq.promptImageKey,
            correctKey: p.mcq.correctKey,
            choices: p.mcq.choices.map((c) => ({
              key: c.key,
              labelText: c.labelText,
              imageKey: c.imageKey,
            })),
          }
        : null,
    })),
  };
}

export async function transitionStoryStatus(
  input: TransitionStoryStatusInput,
): Promise<ActionResult<{ id: string; status: StoryStatus }>> {
  try {
    const user = await requireSession();
    const parsed = transitionStoryStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const story = await prisma.story.findUnique({
      where: { id: parsed.data.storyId },
      include: {
        pages: {
          orderBy: { sortOrder: "asc" },
          include: {
            media: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                kind: true,
                mimeType: true,
                altText: true,
                sortOrder: true,
                storageKey: true,
                studentId: true,
              },
            },
            mcq: {
              select: {
                prompt: true,
                promptImageKey: true,
                correctKey: true,
                choices: {
                  orderBy: { key: "asc" },
                  select: {
                    key: true,
                    labelText: true,
                    imageKey: true,
                  },
                },
              },
            },
          },
        },
        versions: {
          select: { versionNo: true },
          orderBy: { versionNo: "desc" },
          take: 1,
        },
      },
    });
    if (!story) {
      return { ok: false, error: "Cerita tidak ditemukan" };
    }

    const toStatus = parsed.data.toStatus as StoryStatus;
    if (toStatus === StoryStatus.ARCHIVED) {
      return {
        ok: false,
        error: "Arsipkan lewat Hapus cerita dengan alasan wajib",
      };
    }
    if (!canUserTransitionStoryStatus(user, story.status, toStatus)) {
      return {
        ok: false,
        error: "Transisi status tidak diizinkan",
      };
    }

    if (toStatus === StoryStatus.PUBLISHED && story.pages.length === 0) {
      return {
        ok: false,
        error: "Cerita harus punya minimal satu halaman sebelum dipublikasikan",
      };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const data: Prisma.StoryUpdateInput = {
        status: toStatus,
      };

      if (toStatus === StoryStatus.PUBLISHED) {
        data.publishedAt = new Date();
        const nextVersion = (story.versions[0]?.versionNo ?? 0) + 1;
        await tx.storyVersion.create({
          data: {
            storyId: story.id,
            versionNo: nextVersion,
            snapshotJson: buildPublishSnapshot(story),
            createdById: user.id,
          },
        });
      }

      return tx.story.update({
        where: { id: story.id },
        data,
      });
    });

    const auditAction =
      toStatus === StoryStatus.PUBLISHED
        ? "story.publish"
        : "story.status_transition";

    await writeAudit({
      actorId: user.id,
      action: auditAction,
      entityType: "Story",
      entityId: story.id,
      metadata: { from: story.status, to: toStatus },
    });

    revalidateStoryPaths(story.id);
    return { ok: true, data: { id: updated.id, status: updated.status } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal mengubah status cerita"),
    };
  }
}

/** Hapus lunak cerita — Admin; alasan + aktor tersimpan. */
export async function archiveStory(
  input: ArchiveStoryInput,
): Promise<ActionResult<{ id: string; status: StoryStatus }>> {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = archiveStorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const story = await prisma.story.findUnique({
      where: { id: parsed.data.storyId },
      select: { id: true, status: true, title: true },
    });
    if (!story) {
      return { ok: false, error: "Cerita tidak ditemukan" };
    }
    if (story.status === StoryStatus.ARCHIVED) {
      return { ok: false, error: "Cerita sudah diarsipkan" };
    }

    const now = new Date();
    const updated = await prisma.story.update({
      where: { id: story.id },
      data: {
        status: StoryStatus.ARCHIVED,
        archivedReason: parsed.data.reason,
        archivedAt: now,
        archivedById: admin.id,
      },
      select: { id: true, status: true },
    });

    await writeAudit({
      actorId: admin.id,
      action: "story.archive",
      entityType: "Story",
      entityId: story.id,
      metadata: {
        from: story.status,
        to: StoryStatus.ARCHIVED,
        reason: parsed.data.reason,
        title: story.title.slice(0, 120),
      },
    });

    revalidateStoryPaths(story.id);
    return { ok: true, data: { id: updated.id, status: updated.status } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal menghapus cerita"),
    };
  }
}

export type ListedStoryVersion = {
  id: string;
  versionNo: number;
  createdAt: Date;
  createdBy: { id: string; name: string };
};

/** Riwayat versi terbit — tanpa snapshotJson (berat). */
export async function listStoryVersions(
  storyId: string,
): Promise<ListedStoryVersion[]> {
  const parsed = storyIdSchema.safeParse({ storyId });
  if (!parsed.success) throw new AuthzError("Cerita tidak ditemukan", 404);

  const user = await requireSession();
  const story = await prisma.story.findUnique({
    where: { id: parsed.data.storyId },
    select: { id: true, status: true, createdById: true },
  });
  if (!story) throw new AuthzError("Cerita tidak ditemukan", 404);
  if (user.role === "ORANG_TUA" && story.status !== StoryStatus.PUBLISHED) {
    throw new AuthzError();
  }

  return prisma.storyVersion.findMany({
    where: { storyId: story.id },
    orderBy: { versionNo: "desc" },
    take: 50,
    select: {
      id: true,
      versionNo: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
}

/**
 * Pulihkan snapshot versi terbit → konten draf.
 * Mengganti teks halaman + MCQ; halaman di luar snapshot dihapus.
 * Media personalisasi pada halaman yang dihapus ikut hilang (CASCADE).
 */
export async function restoreStoryVersion(
  input: RestoreStoryVersionInput,
): Promise<ActionResult<{ storyId: string; versionNo: number }>> {
  try {
    const user = await requireSession();
    const parsed = restoreStoryVersionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Data tidak valid",
      };
    }

    const story = await prisma.story.findUnique({
      where: { id: parsed.data.storyId },
      select: {
        id: true,
        status: true,
        createdById: true,
        pages: { select: { id: true } },
      },
    });
    if (!story) return { ok: false, error: "Cerita tidak ditemukan" };

    if (user.role === "ADMIN") {
      // Admin boleh pulihkan termasuk dari arsip.
    } else {
      try {
        assertCanEditStoryContent(user, story);
      } catch {
        return { ok: false, error: "Tidak diizinkan memulihkan versi" };
      }
    }

    const version = await prisma.storyVersion.findFirst({
      where: {
        id: parsed.data.versionId,
        storyId: story.id,
      },
      select: {
        id: true,
        versionNo: true,
        snapshotJson: true,
      },
    });
    if (!version) return { ok: false, error: "Versi tidak ditemukan" };

    const snap = publishSnapshotSchema.safeParse(version.snapshotJson);
    if (!snap.success) {
      return { ok: false, error: "Snapshot versi tidak valid" };
    }

    const snapshotPageIds = new Set(snap.data.pages.map((p) => p.id));
    const orphanPageIds = story.pages
      .map((p) => p.id)
      .filter((id) => !snapshotPageIds.has(id));

    await prisma.$transaction(async (tx) => {
      await tx.story.update({
        where: { id: story.id },
        data: {
          title: snap.data.title,
          description: snap.data.description,
          learningObjectives: snap.data.learningObjectives,
          status: StoryStatus.DRAFT,
        },
      });

      if (orphanPageIds.length > 0) {
        await tx.storyPage.deleteMany({
          where: { id: { in: orphanPageIds }, storyId: story.id },
        });
      }

      for (const page of snap.data.pages) {
        const existing = await tx.storyPage.findFirst({
          where: { id: page.id, storyId: story.id },
          select: { id: true },
        });

        if (existing) {
          await tx.storyPage.update({
            where: { id: page.id },
            data: {
              sortOrder: page.sortOrder,
              title: page.title,
              bodyText: page.bodyText,
            },
          });
        } else {
          await tx.storyPage.create({
            data: {
              id: page.id,
              storyId: story.id,
              sortOrder: page.sortOrder,
              title: page.title,
              bodyText: page.bodyText,
            },
          });
        }

        await tx.pageMcq.deleteMany({ where: { pageId: page.id } });
        if (page.mcq) {
          await tx.pageMcq.create({
            data: {
              pageId: page.id,
              prompt: page.mcq.prompt,
              promptImageKey: page.mcq.promptImageKey,
              correctKey: page.mcq.correctKey,
              choices: {
                create: page.mcq.choices.map((c) => ({
                  key: c.key,
                  labelText: c.labelText,
                  imageKey: c.imageKey,
                })),
              },
            },
          });
        }
      }
    });

    await writeAudit({
      actorId: user.id,
      action: "story.version.restore",
      entityType: "StoryVersion",
      entityId: version.id,
      metadata: {
        storyId: story.id,
        versionNo: version.versionNo,
      },
    });

    revalidateStoryPaths(story.id);
    return {
      ok: true,
      data: { storyId: story.id, versionNo: version.versionNo },
    };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal memulihkan versi cerita"),
    };
  }
}
