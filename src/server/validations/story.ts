import { z } from "zod";

export const STORY_STATUSES = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export type StoryStatusValue = (typeof STORY_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<StoryStatusValue, StoryStatusValue[]> = {
  DRAFT: ["REVIEW", "ARCHIVED"],
  REVIEW: ["APPROVED", "DRAFT"],
  APPROVED: ["PUBLISHED", "DRAFT"],
  PUBLISHED: ["ARCHIVED", "DRAFT"],
  ARCHIVED: [],
};

export function canTransitionStoryStatus(from: string, to: string): boolean {
  const allowed = ALLOWED_TRANSITIONS[from as StoryStatusValue];
  return allowed?.includes(to as StoryStatusValue) ?? false;
}

export const createStorySchema = z.object({
  categoryId: z.string().uuid("ID kategori tidak valid"),
  title: z.string().min(1, "Judul wajib").max(200),
  description: z.string().max(5000).optional(),
  learningObjectives: z.string().max(5000).optional(),
});

export const updateStorySchema = z.object({
  id: z.string().uuid("ID cerita tidak valid"),
  categoryId: z.string().uuid("ID kategori tidak valid").optional(),
  title: z.string().min(1, "Judul wajib").max(200).optional(),
  description: z.string().max(5000).optional(),
  learningObjectives: z.string().max(5000).optional(),
});

export const storyIdSchema = z.object({
  storyId: z.string().uuid("ID cerita tidak valid"),
});

export const createPageSchema = z.object({
  storyId: z.string().uuid("ID cerita tidak valid"),
  title: z.string().max(200).optional(),
  bodyText: z.string().max(20000).optional(),
});

export const updatePageSchema = z.object({
  pageId: z.string().uuid("ID halaman tidak valid"),
  title: z.string().max(200),
  bodyText: z.string().max(20000),
});

export const pageIdSchema = z.object({
  pageId: z.string().uuid("ID halaman tidak valid"),
});

export const reorderPagesSchema = z.object({
  storyId: z.string().uuid("ID cerita tidak valid"),
  pageIds: z
    .array(z.string().uuid("ID halaman tidak valid"))
    .min(1, "Daftar halaman wajib"),
});

export const transitionStoryStatusSchema = z.object({
  storyId: z.string().uuid("ID cerita tidak valid"),
  toStatus: z.enum(STORY_STATUSES, {
    message: "Status tidak valid",
  }),
});

/** Hapus lunak (arsip) — alasan wajib untuk jejak audit. */
export const archiveStorySchema = z.object({
  storyId: z.string().uuid("ID cerita tidak valid"),
  reason: z
    .string()
    .trim()
    .min(10, "Alasan minimal 10 karakter")
    .max(500, "Alasan maksimal 500 karakter"),
});

export const restoreStoryVersionSchema = z.object({
  storyId: z.string().uuid("ID cerita tidak valid"),
  versionId: z.string().uuid("ID versi tidak valid"),
});

const snapshotMcqSchema = z.object({
  prompt: z.string(),
  promptImageKey: z.string().nullable(),
  correctKey: z.string().min(1),
  choices: z.array(
    z.object({
      key: z.string().min(1),
      labelText: z.string(),
      imageKey: z.string().nullable(),
    }),
  ),
});

export const publishSnapshotSchema = z.object({
  title: z.string(),
  description: z.string(),
  learningObjectives: z.string(),
  pages: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int(),
      title: z.string(),
      bodyText: z.string(),
      media: z
        .array(
          z.object({
            id: z.string().uuid(),
            kind: z.string(),
            mimeType: z.string(),
            altText: z.string().nullable(),
            sortOrder: z.number().int(),
            storageKey: z.string(),
          }),
        )
        .optional()
        .default([]),
      mcq: snapshotMcqSchema.nullable().optional().default(null),
    }),
  ),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;
export type UpdateStoryInput = z.infer<typeof updateStorySchema>;
export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type ReorderPagesInput = z.infer<typeof reorderPagesSchema>;
export type TransitionStoryStatusInput = z.infer<
  typeof transitionStoryStatusSchema
>;
export type ArchiveStoryInput = z.infer<typeof archiveStorySchema>;
export type RestoreStoryVersionInput = z.infer<
  typeof restoreStoryVersionSchema
>;
