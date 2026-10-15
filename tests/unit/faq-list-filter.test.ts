import { describe, expect, it } from "vitest";
import { faqListWhere, guideListWhere } from "@/server/validations/help";

describe("faqListWhere", () => {
  it("admin sees all", () => {
    expect(faqListWhere("ADMIN")).toEqual({});
  });
  it("non-admin only published", () => {
    expect(faqListWhere("TERAPIS")).toEqual({ isPublished: true });
    expect(faqListWhere("ORANG_TUA")).toEqual({ isPublished: true });
  });
});

describe("guideListWhere", () => {
  it("admin sees all", () => {
    expect(guideListWhere("ADMIN")).toEqual({});
  });
  it("non-admin only published", () => {
    expect(guideListWhere("TERAPIS")).toEqual({ isPublished: true });
    expect(guideListWhere("ORANG_TUA")).toEqual({ isPublished: true });
  });
});
