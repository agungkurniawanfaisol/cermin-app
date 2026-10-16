import { z } from "zod";

const optionalTrimmed = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      const t = v.trim();
      return t.length === 0 ? undefined : t;
    });

const phoneSchema = z
  .string()
  .max(32, "Nomor telepon terlalu panjang")
  .regex(/^[0-9+\-\s()]*$/, "Nomor telepon tidak valid")
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    const t = v.trim();
    return t.length === 0 ? undefined : t;
  });

const boolFromForm = z
  .union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("on")])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (v === true || v === "true" || v === "on") return true;
    return false;
  });

const studentProfileFields = {
  displayName: z.string().min(1, "Nama panggilan wajib").max(120),
  fullName: optionalTrimmed(160),
  dateOfBirth: z.string().optional(),
  homeAddress: optionalTrimmed(300),
  rt: optionalTrimmed(10),
  rw: optionalTrimmed(10),
  phone: phoneSchema,
  emergencyContactName: optionalTrimmed(120),
  emergencyContactPhone: phoneSchema,
  homeLanguage: optionalTrimmed(80),
  preferQuiet: boolFromForm,
  preferDimLight: boolFromForm,
  sensoryNotes: optionalTrimmed(1000),
  allergies: optionalTrimmed(1000),
  requirePhotoForSession: boolFromForm,
  adminNotes: z.string().max(2000).optional(),
};

export const createStudentSchema = z.object({
  ...studentProfileFields,
  /** Optional: tautkan ortu saat buat murid (login + lihat progress anak). */
  parentId: z.string().uuid("ID orang tua tidak valid").optional(),
  relationLabel: z.string().max(80).optional(),
});

export const updateStudentSchema = z.object({
  id: z.string().uuid("ID murid tidak valid"),
  ...studentProfileFields,
});

export const studentIdSchema = z.object({
  studentId: z.string().uuid("ID murid tidak valid"),
});

/** Hapus lunak (arsip) — alasan wajib untuk jejak audit. */
export const archiveStudentSchema = z.object({
  studentId: z.string().uuid("ID murid tidak valid"),
  reason: z
    .string()
    .trim()
    .min(10, "Alasan minimal 10 karakter")
    .max(500, "Alasan maksimal 500 karakter"),
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

export type CreateStudentInput = z.input<typeof createStudentSchema>;
export type UpdateStudentInput = z.input<typeof updateStudentSchema>;
export type ArchiveStudentInput = z.infer<typeof archiveStudentSchema>;
export type AssignTherapistInput = z.infer<typeof assignTherapistSchema>;
export type EndTherapistAssignmentInput = z.infer<
  typeof endTherapistAssignmentSchema
>;
export type LinkParentInput = z.infer<typeof linkParentSchema>;
export type UnlinkParentInput = z.infer<typeof unlinkParentSchema>;
