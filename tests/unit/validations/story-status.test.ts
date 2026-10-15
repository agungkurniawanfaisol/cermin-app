import { describe, expect, it } from "vitest";
import {
  canTransitionStoryStatus,
  STORY_STATUSES,
} from "@/server/validations/story";

const LEGAL: Array<[string, string]> = [
  ["DRAFT", "REVIEW"],
  ["DRAFT", "ARCHIVED"],
  ["REVIEW", "APPROVED"],
  ["REVIEW", "DRAFT"],
  ["APPROVED", "PUBLISHED"],
  ["APPROVED", "DRAFT"],
  ["PUBLISHED", "ARCHIVED"],
  ["PUBLISHED", "DRAFT"],
];

function isLegal(from: string, to: string): boolean {
  return LEGAL.some(([f, t]) => f === from && t === to);
}

describe("canTransitionStoryStatus", () => {
  it.each(LEGAL)("allows %s → %s", (from, to) => {
    expect(canTransitionStoryStatus(from, to)).toBe(true);
  });

  it("denies all transitions from ARCHIVED", () => {
    for (const to of STORY_STATUSES) {
      expect(canTransitionStoryStatus("ARCHIVED", to)).toBe(false);
    }
  });

  it("denies illegal pairs across all statuses", () => {
    for (const from of STORY_STATUSES) {
      for (const to of STORY_STATUSES) {
        if (from === to) {
          expect(canTransitionStoryStatus(from, to)).toBe(false);
          continue;
        }
        expect(canTransitionStoryStatus(from, to)).toBe(isLegal(from, to));
      }
    }
  });

  it("returns false for unknown statuses", () => {
    expect(canTransitionStoryStatus("DRAFT", "UNKNOWN")).toBe(false);
    expect(canTransitionStoryStatus("UNKNOWN", "DRAFT")).toBe(false);
  });
});
