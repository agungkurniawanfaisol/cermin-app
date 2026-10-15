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

export function faqListWhere(role: "ADMIN" | "TERAPIS" | "ORANG_TUA") {
  return role === "ADMIN" ? {} : { isPublished: true as const };
}

export function guideListWhere(role: "ADMIN" | "TERAPIS" | "ORANG_TUA") {
  return role === "ADMIN" ? {} : { isPublished: true as const };
}

export function assertValidGuideFile(file: {
  type: string;
  size: number;
  name: string;
}): string | null {
  const nameOk = file.name.toLowerCase().endsWith(".pdf");
  if (file.type !== GUIDE_MIME && !nameOk) {
    return "File harus PDF";
  }
  if (file.size <= 0) return "File kosong";
  if (file.size > GUIDE_MAX_BYTES) return "Ukuran PDF maksimal 10 MB";
  return null;
}
