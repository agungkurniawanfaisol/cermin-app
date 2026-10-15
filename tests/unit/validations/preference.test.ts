import { describe, expect, it } from "vitest";
import { updatePreferenceSchema } from "@/server/validations/preference";

describe("updatePreferenceSchema", () => {
  it("accepts valid preference", () => {
    const result = updatePreferenceSchema.safeParse({
      textSize: "MD",
      audioEnabled: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid textSize", () => {
    const result = updatePreferenceSchema.safeParse({
      textSize: "HUGE",
      audioEnabled: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean audioEnabled", () => {
    const result = updatePreferenceSchema.safeParse({
      textSize: "LG",
      audioEnabled: "yes",
    });
    expect(result.success).toBe(false);
  });
});
