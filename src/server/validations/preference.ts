import { z } from "zod";

export const textSizeSchema = z.enum(["SM", "MD", "LG", "XL"], {
  message: "Ukuran teks tidak valid",
});

export const updatePreferenceSchema = z.object({
  textSize: textSizeSchema,
  audioEnabled: z.boolean(),
});

export type UpdatePreferenceInput = z.infer<typeof updatePreferenceSchema>;

export const TEXT_SIZE_LABELS: Record<
  z.infer<typeof textSizeSchema>,
  string
> = {
  SM: "Kecil",
  MD: "Sedang",
  LG: "Besar",
  XL: "Sangat besar",
};
