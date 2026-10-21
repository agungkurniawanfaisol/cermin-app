import { describe, expect, it } from "vitest";
import { publishSnapshotSchema } from "@/server/validations/story";

const PAGE_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("publishSnapshotSchema", () => {
  it("accepts snapshot with MCQ", () => {
    const result = publishSnapshotSchema.safeParse({
      title: "Giliran",
      description: "Deskripsi",
      learningObjectives: "Tujuan",
      pages: [
        {
          id: PAGE_ID,
          sortOrder: 1,
          title: "Halaman 1",
          bodyText: "Teks",
          media: [],
          mcq: {
            prompt: "Apa yang dilakukan?",
            promptImageKey: null,
            correctKey: "A",
            choices: [
              { key: "A", labelText: "Antri", imageKey: null },
              { key: "B", labelText: "Berlari", imageKey: null },
            ],
          },
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pages[0]?.mcq?.correctKey).toBe("A");
    }
  });

  it("defaults missing mcq to null", () => {
    const result = publishSnapshotSchema.safeParse({
      title: "Giliran",
      description: "",
      learningObjectives: "",
      pages: [
        {
          id: PAGE_ID,
          sortOrder: 1,
          title: "",
          bodyText: "Teks",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pages[0]?.mcq).toBeNull();
    }
  });
});
