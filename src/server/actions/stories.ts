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
  createPageSchema,
  createStorySchema,
  pageIdSchema,
  reorderPagesSchema,
  storyIdSchema,
  transitionStoryStatusSchema,
  updatePageSchema,
  updateStorySchema,
  type CreatePageInput,
  type CreateStoryInput,
  type ReorderPagesInput,
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
  status: StoryStatus;
  publishedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  category: { id: string; name: string };
  createdBy: { id: string; name: string };
};

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

  const total = await prisma.story.count({ where });
  const meta = paginationMeta({
    page: parsed.page,
    pageSize: parsed.pageSize,
    total,
  });

  const items = await prisma.story.findMany({
    where,
    select: {
      id: true,
      title: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      createdAt: true,
      category: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy,
    skip: meta.skip,
    take: meta.take,
  });

  return toListResult(items, meta);
}

export type StoryPageMedia = {
  id: string;
  kind: string;
  mimeType: string;
  altText: string | null;
  sortOrder: number;
};

export type StoryDetail = Story & {
  category: { id: string; name: string };
  createdBy: { id: string; name: string; email: string };
  pages: Array<StoryPage & { media: StoryPageMedia[] }>;
};

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

    revalidateStoryPaths(story.id);
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
      data: { bodyText: parsed.data.bodyText },
    });

    revalidateStoryPaths(page.storyId);
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

    revalidateStoryPaths(page.storyId);
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

    revalidateStoryPaths(story.id);
    return { ok: true, data: { storyId: story.id } };
  } catch (error) {
    return {
      ok: false,
      error: toActionError(error, "Gagal mengurutkan halaman"),
    };
  }
}

type SnapshotPage = {
  id: string;
  sortOrder: number;
  bodyText: string;
  media: Array<{
    id: string;
    kind: string;
    mimeType: string;
    altText: string | null;
    sortOrder: number;
    storageKey: string;
  }>;
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
      bodyText: p.bodyText,
      media: p.media.map((m) => ({
        id: m.id,
        kind: m.kind,
        mimeType: m.mimeType,
        altText: m.altText,
        sortOrder: m.sortOrder,
        storageKey: m.storageKey,
      })),
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
            media: { orderBy: { sortOrder: "asc" } },
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
        : toStatus === StoryStatus.ARCHIVED
          ? "story.archive"
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
