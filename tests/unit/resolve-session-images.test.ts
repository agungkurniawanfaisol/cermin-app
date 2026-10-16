import { describe, expect, it } from "vitest";

type MediaRow = {
  id: string;
  kind: string;
  studentId: string | null;
  altText?: string | null;
  sortOrder?: number;
};

type MediaRef = { id: string; altText: string | null; sortOrder: number };

/**
 * Mirrors getSessionForReader (1A+2A):
 * - portrait = personalized IMAGE only (no shared fallback, no profile)
 * - storyImages / storyAudios = shared only
 */
function splitPageMedia(
  media: MediaRow[],
  studentId: string,
): {
  portraitImage: MediaRef | null;
  storyImages: MediaRef[];
  storyAudios: MediaRef[];
} {
  const toRef = (m: MediaRow): MediaRef => ({
    id: m.id,
    altText: m.altText ?? null,
    sortOrder: m.sortOrder ?? 0,
  });
  const imagesAll = media.filter((m) => m.kind === "IMAGE");
  const personalized = imagesAll.filter((m) => m.studentId === studentId);
  const shared = imagesAll.filter((m) => m.studentId == null);
  const sharedAudio = media.filter(
    (m) => m.kind === "AUDIO" && m.studentId == null,
  );
  return {
    portraitImage: personalized[0] ? toRef(personalized[0]) : null,
    storyImages: shared.map(toRef),
    storyAudios: sharedAudio.map(toRef),
  };
}

describe("session page media split (portrait vs shared)", () => {
  it("puts personalized image in portrait and keeps shared below", () => {
    const split = splitPageMedia(
      [
        { id: "shared", kind: "IMAGE", studentId: null, sortOrder: 0 },
        { id: "alya", kind: "IMAGE", studentId: "stu-alya", sortOrder: 0 },
        { id: "audio", kind: "AUDIO", studentId: null, sortOrder: 0 },
      ],
      "stu-alya",
    );
    expect(split.portraitImage?.id).toBe("alya");
    expect(split.storyImages.map((m) => m.id)).toEqual(["shared"]);
    expect(split.storyAudios.map((m) => m.id)).toEqual(["audio"]);
  });

  it("leaves portrait empty when no personalized image (no shared fallback)", () => {
    const split = splitPageMedia(
      [
        { id: "shared", kind: "IMAGE", studentId: null },
        { id: "raya", kind: "IMAGE", studentId: "stu-raya" },
      ],
      "stu-alya",
    );
    expect(split.portraitImage).toBeNull();
    expect(split.storyImages.map((m) => m.id)).toEqual(["shared"]);
  });

  it("ignores personalized audio for story strip", () => {
    const split = splitPageMedia(
      [
        { id: "shared-a", kind: "AUDIO", studentId: null },
        { id: "pers-a", kind: "AUDIO", studentId: "stu-alya" },
      ],
      "stu-alya",
    );
    expect(split.storyAudios.map((m) => m.id)).toEqual(["shared-a"]);
  });
});
