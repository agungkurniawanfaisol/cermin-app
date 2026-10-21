import { describe, expect, it } from "vitest";
import {
  upsertPageMcqSchema,
  upsertSessionMcqResponseSchema,
} from "@/server/validations/evaluation";
import { uploadMediaMetaSchema } from "@/server/validations/media";

const uuid = "11111111-1111-4111-8111-111111111111";
const uuid2 = "22222222-2222-4222-8222-222222222222";

describe("upsertPageMcqSchema", () => {
  it("requires prompt", () => {
    const result = upsertPageMcqSchema.safeParse({
      pageId: uuid,
      prompt: "  ",
      correctKey: "A",
      choices: [
        { key: "A", labelText: "Satu" },
        { key: "B", labelText: "Dua" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts 2 choices", () => {
    const result = upsertPageMcqSchema.safeParse({
      pageId: uuid,
      prompt: "Apa yang dilakukan?",
      correctKey: "A",
      choices: [
        { key: "A", labelText: "Satu" },
        { key: "B", labelText: "Dua" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts 3 choices without requiring D", () => {
    const result = upsertPageMcqSchema.safeParse({
      pageId: uuid,
      prompt: "Apa yang dilakukan?",
      correctKey: "A",
      choices: [
        { key: "A", labelText: "Satu" },
        { key: "B", labelText: "Dua" },
        { key: "C", labelText: "Tiga" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts up to 6 choices", () => {
    const result = upsertPageMcqSchema.safeParse({
      pageId: uuid,
      prompt: "Pilih satu",
      correctKey: "F",
      choices: [
        { key: "A", labelText: "1" },
        { key: "B", labelText: "2" },
        { key: "C", labelText: "3" },
        { key: "D", labelText: "4" },
        { key: "E", labelText: "5" },
        { key: "F", labelText: "6" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 6 choices", () => {
    const result = upsertPageMcqSchema.safeParse({
      pageId: uuid,
      prompt: "Pilih",
      correctKey: "A",
      choices: [
        { key: "A", labelText: "1" },
        { key: "B", labelText: "2" },
        { key: "C", labelText: "3" },
        { key: "D", labelText: "4" },
        { key: "E", labelText: "5" },
        { key: "F", labelText: "6" },
        { key: "A", labelText: "7" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate keys", () => {
    const result = upsertPageMcqSchema.safeParse({
      pageId: uuid,
      prompt: "Apa yang dilakukan?",
      correctKey: "A",
      choices: [
        { key: "A", labelText: "Satu" },
        { key: "A", labelText: "Dua" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty choices without labels or images", () => {
    const result = upsertPageMcqSchema.safeParse({
      pageId: uuid,
      prompt: "Soal",
      correctKey: "A",
      choices: [
        { key: "A", labelText: "" },
        { key: "B", labelText: "" },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("upsertSessionMcqResponseSchema", () => {
  it("accepts letter keys including E", () => {
    const result = upsertSessionMcqResponseSchema.safeParse({
      sessionId: uuid,
      studentId: uuid2,
      pageMcqId: uuid,
      selectedKey: "E",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid key", () => {
    const result = upsertSessionMcqResponseSchema.safeParse({
      sessionId: uuid,
      studentId: uuid2,
      pageMcqId: uuid,
      selectedKey: "Z",
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
});
