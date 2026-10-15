import { z } from "zod";

export const faqIdSchema = z.object({
  id: z.string().uuid("ID FAQ tidak valid"),
});

export const faqUpsertSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Pertanyaan wajib")
    .max(300, "Pertanyaan terlalu panjang"),
  answer: z
    .string()
    .trim()
    .min(1, "Jawaban wajib")
    .max(5000, "Jawaban terlalu panjang"),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
  isPublished: z.boolean().optional(),
});

export const guideIdSchema = z.object({
  id: z.string().uuid("ID petunjuk tidak valid"),
});

export const guideMetaSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Judul wajib")
    .max(200, "Judul terlalu panjang"),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
  isPublished: z.boolean().optional(),
});

export const GUIDE_MAX_BYTES = 10 * 1024 * 1024;
export const GUIDE_MIME = "application/pdf";
