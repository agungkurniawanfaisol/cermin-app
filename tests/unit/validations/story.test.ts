import { describe, expect, it } from "vitest";
import {
  createPageSchema,
  createStorySchema,
  reorderPagesSchema,
  transitionStoryStatusSchema,
  updatePageSchema,
} from "@/server/validations/story";

const uuid = "11111111-1111-4111-8111-111111111111";
const pageId = "22222222-2222-4222-8222-222222222222";

describe("createStorySchema", () => {
  it("requires title", () => {
    const result = createStorySchema.safeParse({
      title: "",
      categoryId: uuid,
    });
    expect(result.success).toBe(false);
  });

  it("accepts title + category", () => {
    const result = createStorySchema.safeParse({
      title: "Bergiliran",
      categoryId: uuid,
    });
    expect(result.success).toBe(true);
  });
});

describe("createPageSchema / updatePageSchema", () => {
  it("accepts page create", () => {
    const result = createPageSchema.safeParse({
      storyId: uuid,
      bodyText: "Halaman satu",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid pageId on update", () => {
    const result = updatePageSchema.safeParse({
      pageId: "x",
      title: "",
      bodyText: "teks",
    });
    expect(result.success).toBe(false);
  });

  it("accepts update with title and body", () => {
    const result = updatePageSchema.safeParse({
      pageId,
      title: "Giliran main",
      bodyText: "Halaman diperbarui",
    });
    expect(result.success).toBe(true);
  });
});

describe("reorderPagesSchema", () => {
  it("requires at least one page id", () => {
    const result = reorderPagesSchema.safeParse({
      storyId: uuid,
      pageIds: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("transitionStoryStatusSchema", () => {
  it("rejects invalid status", () => {
    const result = transitionStoryStatusSchema.safeParse({
      storyId: uuid,
      toStatus: "GONE",
    });
    expect(result.success).toBe(false);
  });

  it("accepts PUBLISHED", () => {
    const result = transitionStoryStatusSchema.safeParse({
      storyId: uuid,
      toStatus: "PUBLISHED",
    });
    expect(result.success).toBe(true);
  });
});
