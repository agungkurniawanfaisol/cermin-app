import { describe, expect, it } from "vitest";
import { formatDateId, formatDateTimeId } from "@/lib/format-date";

describe("format-date", () => {
  it("formats fixed instant in Asia/Jakarta", () => {
    const instant = new Date("2026-10-15T10:00:00.000Z");
    expect(formatDateId(instant)).toMatch(/2026/);
    expect(formatDateTimeId(instant)).toMatch(/2026/);
  });
});
