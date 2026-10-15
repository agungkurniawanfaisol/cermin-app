import { z } from "zod";

export const createInviteSchema = z.object({
  email: z.string().email("Email tidak valid"),
  role: z.enum(["TERAPIS", "ORANG_TUA", "ADMIN"]),
  name: z.string().min(1, "Nama wajib").max(120, "Nama terlalu panjang"),
});

/** Panjang + kompleksitas dasar (PRD §7). */
export const invitePasswordSchema = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter")
  .max(128, "Kata sandi terlalu panjang")
  .refine(
    (value) => /[A-Za-z]/.test(value) && /\d/.test(value),
    "Kata sandi harus mengandung huruf dan angka",
  );

export const acceptInviteSchema = z.object({
  token: z.string().min(1, "Token wajib").max(128, "Token tidak valid"),
  password: invitePasswordSchema,
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
