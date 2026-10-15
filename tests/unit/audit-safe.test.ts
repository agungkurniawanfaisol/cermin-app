import { describe, expect, it } from "vitest";
import {
  isSensitiveAuditKey,
  sanitizeAuditMetadata,
} from "@/lib/audit-safe";
import { REQUIRED_AUDIT_ACTIONS } from "@/lib/audit-actions";

describe("isSensitiveAuditKey", () => {
  it.each([
    "password",
    "token",
    "rawToken",
    "tokenHash",
    "adminNotes",
    "note",
    "observation",
    "inviteToken",
  ])("flags %s", (key) => {
    expect(isSensitiveAuditKey(key)).toBe(true);
  });

  it("allows safe keys", () => {
    expect(isSensitiveAuditKey("email")).toBe(false);
    expect(isSensitiveAuditKey("studentId")).toBe(false);
    expect(isSensitiveAuditKey("role")).toBe(false);
  });
});

describe("sanitizeAuditMetadata", () => {
  it("strips sensitive keys and keeps ids", () => {
    const cleaned = sanitizeAuditMetadata({
      studentId: "s1",
      email: "a@b.c",
      password: "rahasia12",
      token: "raw-secret",
      adminNotes: "rahasia klinis",
      note: "observasi penuh",
      nested: { tokenHash: "abc", storyId: "st1" },
    });
    expect(cleaned).toEqual({
      studentId: "s1",
      email: "a@b.c",
      nested: { storyId: "st1" },
    });
  });

  it("returns undefined for empty input", () => {
    expect(sanitizeAuditMetadata(undefined)).toBeUndefined();
  });
});

describe("REQUIRED_AUDIT_ACTIONS", () => {
  it("covers ACCESS-CONTROL §10 minimum set", () => {
    const required = new Set<string>(REQUIRED_AUDIT_ACTIONS);
    for (const action of [
      "invite.create",
      "user.disable",
      "student.create",
      "student.update",
      "assignment.assign",
      "assignment.end",
      "parent.link",
      "parent.unlink",
      "story.publish",
      "story.archive",
      "media.upload",
      "session.start",
      "session.end",
    ]) {
      expect(required.has(action)).toBe(true);
    }
  });
});
