import { describe, expect, it } from "vitest";
import {
  canAccessGuideDocument,
  type PolicyUser,
} from "@/server/policies/access";

const admin: PolicyUser = { id: "a", role: "ADMIN", status: "ACTIVE" };
const terapis: PolicyUser = { id: "t", role: "TERAPIS", status: "ACTIVE" };
const ortu: PolicyUser = { id: "o", role: "ORANG_TUA", status: "ACTIVE" };
const disabled: PolicyUser = {
  id: "d",
  role: "TERAPIS",
  status: "DISABLED",
};

describe("canAccessGuideDocument", () => {
  it("allows any active user for published guide", () => {
    expect(canAccessGuideDocument(admin, { isPublished: true })).toBe(true);
    expect(canAccessGuideDocument(terapis, { isPublished: true })).toBe(true);
    expect(canAccessGuideDocument(ortu, { isPublished: true })).toBe(true);
  });

  it("allows only admin for unpublished guide", () => {
    expect(canAccessGuideDocument(admin, { isPublished: false })).toBe(true);
    expect(canAccessGuideDocument(terapis, { isPublished: false })).toBe(
      false,
    );
    expect(canAccessGuideDocument(ortu, { isPublished: false })).toBe(false);
  });

  it("denies disabled users", () => {
    expect(canAccessGuideDocument(disabled, { isPublished: true })).toBe(
      false,
    );
  });
});
