import { z } from "zod";

export const uploadMediaMetaSchema = z
  .object({
    kind: z.enum(["IMAGE", "AUDIO"], {
      message: "Jenis media harus IMAGE atau AUDIO",
    }),
    pageId: z.string().uuid("ID halaman tidak valid").optional(),
    storyId: z.string().uuid("ID cerita tidak valid").optional(),
    /** Opsional: gambar personalisasi untuk murid tertentu. */
    studentId: z.string().uuid("ID murid tidak valid").optional(),
    altText: z
      .string()
      .trim()
      .max(500, "Teks alternatif terlalu panjang")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.pageId && !data.storyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "pageId atau storyId wajib diisi",
        path: ["pageId"],
      });
    }
    if (data.kind === "IMAGE" && !data.altText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Teks alternatif (altText) wajib untuk gambar",
        path: ["altText"],
      });
    }
    if (data.kind === "AUDIO" && data.studentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Audio tidak dapat dipersonalisasi per murid",
        path: ["studentId"],
      });
    }
    if (data.studentId && !data.pageId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Personalisasi gambar memerlukan pageId",
        path: ["pageId"],
      });
    }
  });

export const mediaIdSchema = z.object({
  id: z.string().uuid("ID media tidak valid"),
});

export type UploadMediaMetaInput = z.infer<typeof uploadMediaMetaSchema>;
