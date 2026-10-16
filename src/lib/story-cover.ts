/**
 * Resolve cover media for story cards / list preview.
 * Prefer story-level IMAGE (pageId null, studentId null); else first page shared IMAGE.
 */
export function resolveStoryCoverMediaId(opts: {
  storyLevelCoverId?: string | null;
  pages: Array<{ media: Array<{ id: string }> }>;
}): string | null {
  const storyLevel = opts.storyLevelCoverId?.trim();
  if (storyLevel) return storyLevel;
  return opts.pages.find((p) => p.media[0]?.id)?.media[0]?.id ?? null;
}

/** Prisma `where` for dedicated story cover assets. */
export const storyCoverMediaWhere = {
  pageId: null as null,
  kind: "IMAGE" as const,
  studentId: null as null,
};
