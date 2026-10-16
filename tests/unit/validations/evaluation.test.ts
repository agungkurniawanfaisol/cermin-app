import { describe, expect, it } from "vitest";
import {
  createStoryEvaluationSchema,
  storyEvaluationItemSchema,
  upsertSessionEvaluationResponseSchema,
  upsertStoryEvaluationSchema,
} from "@/server/validations/evaluation";
import { uploadMediaMetaSchema } from "@/server/validations/media";

const uuid = "11111111-1111-4111-8111-111111111111";
const uuid2 = "22222222-2222-4222-8222-222222222222";

describe("createStoryEvaluationSchema", () => {
  it("requires title", () => {
    const result = createStoryEvaluationSchema.safeParse({
      storyId: uuid,
      title: "  ",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid payload", () => {
    const result = createStoryEvaluationSchema.safeParse({
      storyId: uuid,
      title: "Evaluasi bergiliran",
    });
    expect(result.success).toBe(true);
  });
});

describe("upsertStoryEvaluationSchema", () => {
  it("requires title", () => {
    const result = upsertStoryEvaluationSchema.safeParse({
      storyId: uuid,
      title: "   ",
      items: [{ prompt: "Menunggu giliran" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty items array", () => {
    const result = upsertStoryEvaluationSchema.safeParse({
      storyId: uuid,
      title: "Evaluasi Bergiliran",
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid research indicator items", () => {
    const result = upsertStoryEvaluationSchema.safeParse({
      storyId: uuid,
      title: "Indikator Perilaku Bergiliran",
      description: "Observasi riset",
      items: [
        { prompt: "Menunggu giliran teman tanpa merebut alat permainan", itemType: "TEXT", sortOrder: 1 },
        { prompt: "Memulai giliran sendiri ketika gilirannya tiba", itemType: "TEXT", sortOrder: 2 },
        { prompt: "Menyerahkan alat atau giliran kepada teman setelah selesai", itemType: "TEXT", sortOrder: 3 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects items with empty prompt", () => {
    const result = upsertStoryEvaluationSchema.safeParse({
      storyId: uuid,
      title: "Evaluasi",
      items: [{ prompt: "   " }],
    });
    expect(result.success).toBe(false);
  });
});

describe("uploadMediaMeta studentId rules", () => {
  it("rejects studentId on AUDIO", () => {
    const result = uploadMediaMetaSchema.safeParse({
      kind: "AUDIO",
      pageId: uuid,
      studentId: uuid2,
    });
    expect(result.success).toBe(false);
  });

  it("accepts IMAGE with studentId and altText", () => {
    const result = uploadMediaMetaSchema.safeParse({
      kind: "IMAGE",
      pageId: uuid,
      studentId: uuid2,
      altText: "Foto Alya",
    });
    expect(result.success).toBe(true);
  });
});

describe("upsertSessionEvaluationResponseSchema", () => {
  it("accepts text value", () => {
    const result = upsertSessionEvaluationResponseSchema.safeParse({
      sessionId: uuid,
      evaluationItemId: uuid2,
      value: "Anak menunggu dengan tenang",
    });
    expect(result.success).toBe(true);
  });

  it("accepts scale 1-5", () => {
    const result = upsertSessionEvaluationResponseSchema.safeParse({
      sessionId: uuid,
      evaluationItemId: uuid2,
      value: 4,
    });
    expect(result.success).toBe(true);
  });

  it("rejects scale out of range", () => {
    const result = upsertSessionEvaluationResponseSchema.safeParse({
      sessionId: uuid,
      evaluationItemId: uuid2,
      value: 9,
    });
    expect(result.success).toBe(false);
  });
});
