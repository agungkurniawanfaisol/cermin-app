import { z } from "zod";

export const createInviteSchema = z.object({
  email: z.string().email("Email tidak valid"),
  role: z.enum(["TERAPIS", "ORANG_TUA", "ADMIN"]),
  name: z.string().min(1, "Nama wajib"),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, "Token wajib"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
