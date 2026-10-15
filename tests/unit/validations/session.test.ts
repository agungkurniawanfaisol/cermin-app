import { describe, expect, it } from "vitest";
import {
  addObservationSchema,
  startLearningSessionSchema,
} from "@/server/validations/session";

const STUDENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const STORY_ID = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
const SESSION_ID = "6ba7b811-9dad-41d1-80b4-00c04fd430c8";

describe("startLearningSessionSchema", () => {
  it("accepts valid uuids", () => {
    const result = startLearningSessionSchema.safeParse({
      studentId: STUDENT_ID,
      storyId: STORY_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid ids", () => {
    const result = startLearningSessionSchema.safeParse({
      studentId: "x",
      storyId: "y",
    });
    expect(result.success).toBe(false);
  });
});

describe("addObservationSchema", () => {
  it("rejects blank note", () => {
    const result = addObservationSchema.safeParse({
      sessionId: SESSION_ID,
      note: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("trims note", () => {
    const result = addObservationSchema.safeParse({
      sessionId: SESSION_ID,
      note: "  fokus baik  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBe("fokus baik");
    }
  });
});
