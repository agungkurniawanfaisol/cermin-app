import { z } from "zod";

/** Nonaktifkan / hapus lunak akun — alasan wajib untuk jejak audit. */
export const disableUserSchema = z.object({
  userId: z.string().uuid("ID pengguna tidak valid"),
  reason: z
    .string()
    .trim()
    .min(10, "Alasan minimal 10 karakter")
    .max(500, "Alasan maksimal 500 karakter"),
});

export type DisableUserInput = z.infer<typeof disableUserSchema>;
