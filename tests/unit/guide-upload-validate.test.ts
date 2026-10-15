import { describe, expect, it } from "vitest";
import {
  assertValidGuideFile,
  GUIDE_MAX_BYTES,
  GUIDE_MIME,
} from "@/server/validations/help";

describe("assertValidGuideFile", () => {
  it("rejects wrong mime and name", () => {
    expect(
      assertValidGuideFile({
        type: "image/png",
        size: 100,
        name: "doc.txt",
      }),
    ).toBe("File harus PDF");
  });

  it("rejects oversize pdf", () => {
    expect(
      assertValidGuideFile({
        type: GUIDE_MIME,
        size: GUIDE_MAX_BYTES + 1,
        name: "petunjuk.pdf",
      }),
    ).toBe("Ukuran PDF maksimal 10 MB");
  });

  it("accepts valid pdf by mime", () => {
    expect(
      assertValidGuideFile({
        type: GUIDE_MIME,
        size: 1024,
        name: "petunjuk.pdf",
      }),
    ).toBeNull();
  });

  it("accepts pdf extension when mime empty", () => {
    expect(
      assertValidGuideFile({
        type: "",
        size: 512,
        name: "petunjuk.pdf",
      }),
    ).toBeNull();
  });
});
