import { z } from "zod";

export const EVAL_ITEM_TYPES = ["TEXT", "SCALE", "SKALA", "PILIHAN"] as const;
export type EvalItemType = (typeof EVAL_ITEM_TYPES)[number];

export const storyEvaluationItemSchema = z.object({
  id: z.string().uuid("ID item tidak valid").optional(),
  prompt: z
    .string()
    .trim()
    .min(1, "Pertanyaan/indikator evaluasi wajib")
    .max(500, "Pertanyaan terlalu panjang"),
  itemType: z.enum(EVAL_ITEM_TYPES).default("TEXT"),
  sortOrder: z.number().int().default(0),
});

export const upsertStoryEvaluationSchema = z.object({
  storyId: z.string().uuid("ID cerita tidak valid"),
  evaluationId: z.string().uuid("ID evaluasi tidak valid").optional(),
  title: z
    .string()
    .trim()
    .min(1, "Judul evaluasi wajib")
    .max(200, "Judul terlalu panjang"),
  description: z.string().trim().max(1000).optional().default(""),
  items: z.array(storyEvaluationItemSchema).min(1, "Minimal 1 butir evaluasi"),
});

export type StoryEvaluationItemInput = z.infer<typeof storyEvaluationItemSchema>;
export type UpsertStoryEvaluationInput = z.infer<typeof upsertStoryEvaluationSchema>;
export const createStoryEvaluationSchema = z.object({
  storyId: z.string().uuid("ID cerita tidak valid"),
  title: z
    .string()
    .trim()
    .min(1, "Judul evaluasi wajib")
    .max(200, "Judul terlalu panjang"),
  description: z.string().trim().max(2000).optional().default(""),
});

export const updateStoryEvaluationSchema = z.object({
  evaluationId: z.string().uuid("ID evaluasi tidak valid"),
  title: z
    .string()
    .trim()
    .min(1, "Judul evaluasi wajib")
    .max(200, "Judul terlalu panjang"),
  description: z.string().trim().max(2000).optional().default(""),
});

export const deleteStoryEvaluationSchema = z.object({
  evaluationId: z.string().uuid("ID evaluasi tidak valid"),
});

export const createEvaluationItemSchema = z.object({
  evaluationId: z.string().uuid("ID evaluasi tidak valid"),
  prompt: z
    .string()
    .trim()
    .min(1, "Pertanyaan wajib")
    .max(500, "Pertanyaan terlalu panjang"),
  itemType: z.enum(EVAL_ITEM_TYPES).default("TEXT"),
});

export const updateEvaluationItemSchema = z.object({
  itemId: z.string().uuid("ID item tidak valid"),
  prompt: z
    .string()
    .trim()
    .min(1, "Pertanyaan wajib")
    .max(500, "Pertanyaan terlalu panjang"),
  itemType: z.enum(EVAL_ITEM_TYPES),
});

export const deleteEvaluationItemSchema = z.object({
  itemId: z.string().uuid("ID item tidak valid"),
});

export const upsertSessionEvaluationResponseSchema = z.object({
  sessionId: z.string().uuid("ID sesi tidak valid"),
  evaluationItemId: z.string().uuid("ID item tidak valid"),
  value: z.union([
    z.string().trim().max(5000),
    z.number().int().min(1).max(5),
  ]),
  note: z.string().trim().max(2000).optional().nullable(),
});

export type CreateStoryEvaluationInput = z.infer<
  typeof createStoryEvaluationSchema
>;
export type UpsertSessionEvaluationResponseInput = z.infer<
  typeof upsertSessionEvaluationResponseSchema
>;
