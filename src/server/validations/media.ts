import { z } from "zod";

export const uploadMediaMetaSchema = z
  .object({
    kind: z.enum(["IMAGE", "AUDIO"], {
      message: "Jenis media harus IMAGE atau AUDIO",
    }),
    pageId: z.string().uuid("ID halaman tidak valid").optional(),
    storyId: z.string().uuid("ID cerita tidak valid").optional(),
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
  });

export const mediaIdSchema = z.object({
  id: z.string().uuid("ID media tidak valid"),
});

export type UploadMediaMetaInput = z.infer<typeof uploadMediaMetaSchema>;
