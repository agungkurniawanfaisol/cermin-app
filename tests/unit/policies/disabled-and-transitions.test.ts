import { StoryStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  canAccessStudent,
  canLeadSession,
  canPublishStory,
  canUserTransitionStoryStatus,
  type PolicyUser,
} from "@/server/policies/access";

const disabledAdmin: PolicyUser = {
  id: "da",
  role: "ADMIN",
  status: "DISABLED",
};
const disabledTerapis: PolicyUser = {
  id: "dt",
  role: "TERAPIS",
  status: "DISABLED",
};
const terapis: PolicyUser = { id: "t", role: "TERAPIS", status: "ACTIVE" };
const admin: PolicyUser = { id: "a", role: "ADMIN", status: "ACTIVE" };

describe("DISABLED user (U7)", () => {
  it("denies student access even for admin", () => {
    expect(
      canAccessStudent(disabledAdmin, { assigned: true, linked: true }),
    ).toBe(false);
  });

  it("denies terapis with assignment", () => {
    expect(
      canAccessStudent(disabledTerapis, { assigned: true, linked: false }),
    ).toBe(false);
  });

  it("denies lead session and publish", () => {
    expect(
      canLeadSession(disabledTerapis, { assigned: true, linked: false }),
    ).toBe(false);
    expect(canPublishStory(disabledAdmin)).toBe(false);
  });
});

describe("story transitions by role (U5)", () => {
  it("denies terapis draft→published", () => {
    expect(
      canUserTransitionStoryStatus(
        terapis,
        StoryStatus.DRAFT,
        StoryStatus.PUBLISHED,
      ),
    ).toBe(false);
  });

  it("allows terapis draft→review only", () => {
    expect(
      canUserTransitionStoryStatus(
        terapis,
        StoryStatus.DRAFT,
        StoryStatus.REVIEW,
      ),
    ).toBe(true);
    expect(
      canUserTransitionStoryStatus(
        terapis,
        StoryStatus.REVIEW,
        StoryStatus.APPROVED,
      ),
    ).toBe(false);
  });

  it("allows admin publish", () => {
    expect(
      canUserTransitionStoryStatus(
        admin,
        StoryStatus.APPROVED,
        StoryStatus.PUBLISHED,
      ),
    ).toBe(true);
  });
});
