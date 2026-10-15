import { describe, expect, it } from "vitest";
import {
  canAccessStudent,
  canPublishStory,
  canLeadSession,
  type PolicyUser,
} from "@/server/policies/access";

const admin: PolicyUser = { id: "a", role: "ADMIN", status: "ACTIVE" };
const terapis: PolicyUser = { id: "t", role: "TERAPIS", status: "ACTIVE" };
const ortu: PolicyUser = { id: "o", role: "ORANG_TUA", status: "ACTIVE" };

describe("canAccessStudent", () => {
  it("allows admin", () => {
    expect(canAccessStudent(admin, { assigned: false, linked: false })).toBe(
      true,
    );
  });
  it("allows assigned terapis", () => {
    expect(canAccessStudent(terapis, { assigned: true, linked: false })).toBe(
      true,
    );
  });
  it("denies unassigned terapis", () => {
    expect(canAccessStudent(terapis, { assigned: false, linked: false })).toBe(
      false,
    );
  });
  it("allows linked ortu", () => {
    expect(canAccessStudent(ortu, { assigned: false, linked: true })).toBe(
      true,
    );
  });
  it("denies unlinked ortu", () => {
    expect(canAccessStudent(ortu, { assigned: false, linked: false })).toBe(
      false,
    );
  });
});

describe("canPublishStory", () => {
  it("only admin", () => {
    expect(canPublishStory(admin)).toBe(true);
    expect(canPublishStory(terapis)).toBe(false);
  });
});

describe("canLeadSession", () => {
  it("matches student access", () => {
    expect(canLeadSession(terapis, { assigned: true, linked: false })).toBe(
      true,
    );
    expect(canLeadSession(ortu, { assigned: false, linked: true })).toBe(true);
  });
});
