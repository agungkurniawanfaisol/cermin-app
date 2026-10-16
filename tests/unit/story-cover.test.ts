import { describe, expect, it } from "vitest";
import { resolveStoryCoverMediaId } from "@/lib/story-cover";

describe("resolveStoryCoverMediaId", () => {
  it("prefers story-level cover over page IMAGE", () => {
    const id = resolveStoryCoverMediaId({
      storyLevelCoverId: "cover-1",
      pages: [{ media: [{ id: "page-img-1" }] }],
    });
    expect(id).toBe("cover-1");
  });

  it("falls back to first page shared IMAGE", () => {
    const id = resolveStoryCoverMediaId({
      storyLevelCoverId: null,
      pages: [
        { media: [] },
        { media: [{ id: "page-img-2" }] },
      ],
    });
    expect(id).toBe("page-img-2");
  });

  it("returns null when no cover and no page IMAGE", () => {
    const id = resolveStoryCoverMediaId({
      storyLevelCoverId: "",
      pages: [{ media: [] }],
    });
    expect(id).toBeNull();
  });
});
