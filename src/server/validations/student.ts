import { z } from "zod";

export const createStudentSchema = z.object({
  displayName: z.string().min(1, "Nama murid wajib").max(120),
  dateOfBirth: z.string().optional(), // ISO date
  adminNotes: z.string().max(2000).optional(),
});

export const updateStudentSchema = createStudentSchema.extend({
  id: z.string().uuid("ID murid tidak valid"),
});

export const studentIdSchema = z.object({
  studentId: z.string().uuid("ID murid tidak valid"),
});

export const assignTherapistSchema = z.object({
  studentId: z.string().uuid("ID murid tidak valid"),
  therapistId: z.string().uuid("ID terapis tidak valid"),
});

export const endTherapistAssignmentSchema = z.object({
  assignmentId: z.string().uuid("ID penugasan tidak valid"),
});

export const linkParentSchema = z.object({
  studentId: z.string().uuid("ID murid tidak valid"),
  parentId: z.string().uuid("ID orang tua tidak valid"),
  relationLabel: z.string().max(80).optional(),
});

export const unlinkParentSchema = z.object({
  linkId: z.string().uuid("ID tautan tidak valid"),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type AssignTherapistInput = z.infer<typeof assignTherapistSchema>;
export type EndTherapistAssignmentInput = z.infer<
  typeof endTherapistAssignmentSchema
>;
export type LinkParentInput = z.infer<typeof linkParentSchema>;
export type UnlinkParentInput = z.infer<typeof unlinkParentSchema>;
