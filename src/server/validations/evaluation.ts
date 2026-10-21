import { z } from "zod";

/** Label opsi: A…F (maks 6 pilihan agar muat 1 layar di /belajar). */
export const MCQ_KEY_POOL = ["A", "B", "C", "D", "E", "F"] as const;
export type McqKey = (typeof MCQ_KEY_POOL)[number];

export const MCQ_MIN_CHOICES = 2;
export const MCQ_MAX_CHOICES = 6;

export const mcqKeySchema = z.enum(MCQ_KEY_POOL);

export const pageMcqChoiceInputSchema = z.object({
  key: mcqKeySchema,
  labelText: z
    .string()
    .trim()
    .max(500, "Teks pilihan terlalu panjang")
    .default(""),
  /** Keep existing Storage key; null clears image; omit = unchanged on partial updates handled in action. */
  imageKey: z.string().trim().min(1).max(500).nullable().optional(),
});

export const upsertPageMcqSchema = z
  .object({
    pageId: z.string().uuid("ID halaman tidak valid"),
    prompt: z
      .string()
      .trim()
      .min(1, "Pertanyaan soal wajib")
      .max(1000, "Pertanyaan terlalu panjang"),
    correctKey: mcqKeySchema,
    promptImageKey: z.string().trim().min(1).max(500).nullable().optional(),
    choices: z
      .array(pageMcqChoiceInputSchema)
      .min(MCQ_MIN_CHOICES, `Minimal ${MCQ_MIN_CHOICES} pilihan`)
      .max(MCQ_MAX_CHOICES, `Maksimal ${MCQ_MAX_CHOICES} pilihan`),
  })
  .superRefine((data, ctx) => {
    const keys = data.choices.map((c) => c.key);
    const unique = new Set(keys);
    if (unique.size !== keys.length) {
      ctx.addIssue({
        code: "custom",
        message: "Setiap pilihan harus punya huruf unik",
        path: ["choices"],
      });
    }
    if (!unique.has(data.correctKey)) {
      ctx.addIssue({
        code: "custom",
        message: "Jawaban benar harus salah satu pilihan yang ada",
        path: ["correctKey"],
      });
    }
    const hasAnyLabel = data.choices.some((c) => c.labelText.trim().length > 0);
    const hasAnyImage = data.choices.some(
      (c) => typeof c.imageKey === "string" && c.imageKey.length > 0,
    );
    if (!hasAnyLabel && !hasAnyImage) {
      ctx.addIssue({
        code: "custom",
        message: "Minimal satu pilihan punya teks atau gambar",
        path: ["choices"],
      });
    }
  });

export const deletePageMcqSchema = z.object({
  pageId: z.string().uuid("ID halaman tidak valid"),
});

export const upsertSessionMcqResponseSchema = z.object({
  sessionId: z.string().uuid("ID sesi tidak valid"),
  studentId: z.string().uuid("ID murid tidak valid"),
  pageMcqId: z.string().uuid("ID soal tidak valid"),
  selectedKey: mcqKeySchema,
});

export type UpsertPageMcqInput = z.infer<typeof upsertPageMcqSchema>;
export type DeletePageMcqInput = z.infer<typeof deletePageMcqSchema>;
export type UpsertSessionMcqResponseInput = z.infer<
  typeof upsertSessionMcqResponseSchema
>;

export function nextMcqKey(existing: string[]): McqKey | null {
  for (const k of MCQ_KEY_POOL) {
    if (!existing.includes(k)) return k;
  }
  return null;
}
