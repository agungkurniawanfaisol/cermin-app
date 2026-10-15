import { describe, expect, it } from "vitest";
import {
  assignTherapistSchema,
  createStudentSchema,
  linkParentSchema,
  updateStudentSchema,
} from "@/server/validations/student";

describe("createStudentSchema", () => {
  it("requires displayName", () => {
    const result = createStudentSchema.safeParse({ displayName: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Nama murid wajib");
    }
  });

  it("accepts displayName only", () => {
    const result = createStudentSchema.safeParse({ displayName: "Alya" });
    expect(result.success).toBe(true);
  });

  it("accepts optional ISO date and notes", () => {
    const result = createStudentSchema.safeParse({
      displayName: "Alya",
      dateOfBirth: "2018-05-12",
      adminNotes: "Catatan singkat",
    });
    expect(result.success).toBe(true);
  });

  it("rejects adminNotes over 2000 chars", () => {
    const result = createStudentSchema.safeParse({
      displayName: "Alya",
      adminNotes: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateStudentSchema", () => {
  it("requires uuid id", () => {
    const result = updateStudentSchema.safeParse({
      id: "not-uuid",
      displayName: "Alya",
    });
    expect(result.success).toBe(false);
  });
});

const STUDENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const THERAPIST_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const PARENT_ID = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

describe("assignTherapistSchema", () => {
  it("requires student and therapist uuids", () => {
    const ok = assignTherapistSchema.safeParse({
      studentId: STUDENT_ID,
      therapistId: THERAPIST_ID,
    });
    expect(ok.success).toBe(true);

    const bad = assignTherapistSchema.safeParse({
      studentId: "x",
      therapistId: "y",
    });
    expect(bad.success).toBe(false);
  });
});

describe("linkParentSchema", () => {
  it("accepts optional relationLabel", () => {
    const result = linkParentSchema.safeParse({
      studentId: STUDENT_ID,
      parentId: PARENT_ID,
      relationLabel: "Ibu",
    });
    expect(result.success).toBe(true);
  });
});
