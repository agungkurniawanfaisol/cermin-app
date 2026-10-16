import { describe, expect, it } from "vitest";
import {
  mediaIdSchema,
  uploadMediaMetaSchema,
} from "@/server/validations/media";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("uploadMediaMetaSchema", () => {
  it("requires pageId or storyId", () => {
    const result = uploadMediaMetaSchema.safeParse({
      kind: "IMAGE",
      altText: "Anak bermain",
    });
    expect(result.success).toBe(false);
  });

  it("requires altText for IMAGE", () => {
    const result = uploadMediaMetaSchema.safeParse({
      kind: "IMAGE",
      pageId: uuid,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/altText/i);
    }
  });

  it("rejects non-uuid pageId", () => {
    const result = uploadMediaMetaSchema.safeParse({
      kind: "AUDIO",
      pageId: "bukan-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts IMAGE with pageId and altText", () => {
    const result = uploadMediaMetaSchema.safeParse({
      kind: "IMAGE",
      pageId: uuid,
      altText: "Anak bermain",
    });
    expect(result.success).toBe(true);
  });

  it("accepts story-level IMAGE cover without pageId", () => {
    const result = uploadMediaMetaSchema.safeParse({
      kind: "IMAGE",
      storyId: uuid,
      altText: "Gambar utama cerita",
    });
    expect(result.success).toBe(true);
  });

  it("rejects personalized IMAGE without pageId", () => {
    const result = uploadMediaMetaSchema.safeParse({
      kind: "IMAGE",
      storyId: uuid,
      studentId: "22222222-2222-4222-8222-222222222222",
      altText: "Foto Alya",
    });
    expect(result.success).toBe(false);
  });

  it("accepts AUDIO without altText", () => {
    const result = uploadMediaMetaSchema.safeParse({
      kind: "AUDIO",
      storyId: uuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects studentId on AUDIO", () => {
    const result = uploadMediaMetaSchema.safeParse({
      kind: "AUDIO",
      pageId: uuid,
      studentId: "22222222-2222-4222-8222-222222222222",
    });
    expect(result.success).toBe(false);
  });

  it("accepts personalized IMAGE", () => {
    const result = uploadMediaMetaSchema.safeParse({
      kind: "IMAGE",
      pageId: uuid,
      studentId: "22222222-2222-4222-8222-222222222222",
      altText: "Foto Alya",
    });
    expect(result.success).toBe(true);
  });
});

describe("mediaIdSchema", () => {
  it("rejects invalid id", () => {
    expect(mediaIdSchema.safeParse({ id: "x" }).success).toBe(false);
  });

  it("accepts uuid", () => {
    expect(mediaIdSchema.safeParse({ id: uuid }).success).toBe(true);
  });
});
