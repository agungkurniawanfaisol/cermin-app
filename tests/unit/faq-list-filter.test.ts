import { describe, expect, it } from "vitest";
import { faqListWhere } from "@/server/actions/faqs";

describe("faqListWhere", () => {
  it("admin sees all", () => {
    expect(faqListWhere("ADMIN")).toEqual({});
  });
  it("non-admin only published", () => {
    expect(faqListWhere("TERAPIS")).toEqual({ isPublished: true });
    expect(faqListWhere("ORANG_TUA")).toEqual({ isPublished: true });
  });
});
