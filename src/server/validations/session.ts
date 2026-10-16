import { z } from "zod";

export const startLearningSessionSchema = z.object({
  studentId: z.string().uuid("ID murid tidak valid"),
  storyId: z.string().uuid("ID cerita tidak valid"),
});

export const sessionIdSchema = z.object({
  sessionId: z.string().uuid("ID sesi tidak valid"),
});

export const addObservationSchema = z.object({
  sessionId: z.string().uuid("ID sesi tidak valid"),
  note: z
    .string()
    .trim()
    .min(1, "Catatan tidak boleh kosong")
    .max(5000, "Catatan terlalu panjang"),
});

export const updateSessionStudentSchema = z.object({
  sessionId: z.string().uuid("ID sesi tidak valid"),
  studentId: z.string().uuid("ID murid tidak valid"),
});

export type StartLearningSessionInput = z.infer<
  typeof startLearningSessionSchema
>;
export type AddObservationInput = z.infer<typeof addObservationSchema>;
export type UpdateSessionStudentInput = z.infer<
  typeof updateSessionStudentSchema
>;
