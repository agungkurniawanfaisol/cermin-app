import { z } from "zod";

function emptyToUndefined(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t.length === 0 ? undefined : t;
}

const optionalHttpUrl = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .max(500)
    .url({ message: "URL tidak valid" })
    .refine((v) => /^https?:\/\//i.test(v), {
      message: "URL harus diawali http:// atau https://",
    })
    .optional(),
);

const optionalWhatsapp = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .max(500)
    .refine(
      (v) =>
        /^https?:\/\//i.test(v) ||
        /^wa\.me\//i.test(v) ||
        /^\+?[0-9\s-]{8,20}$/.test(v),
      {
        message:
          "WhatsApp: URL https://wa.me/... atau nomor (contoh +62812…)",
      },
    )
    .optional(),
);

export const institutionProfileSchema = z.object({
  name: z.preprocess(
    emptyToUndefined,
    z.string().max(200, "Nama maks. 200 karakter").optional(),
  ),
  address: z.preprocess(
    emptyToUndefined,
    z.string().max(1000, "Alamat maks. 1000 karakter").optional(),
  ),
  websiteUrl: optionalHttpUrl,
  instagramUrl: optionalHttpUrl,
  facebookUrl: optionalHttpUrl,
  youtubeUrl: optionalHttpUrl,
  whatsappUrl: optionalWhatsapp,
});

export type InstitutionProfileInput = z.infer<typeof institutionProfileSchema>;
