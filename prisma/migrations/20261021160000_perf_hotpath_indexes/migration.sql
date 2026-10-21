-- Hot-path indexes (query reasons in comments).

-- getSessionForReader: observasi per sesi, urut terbaru
CREATE INDEX IF NOT EXISTS "session_observations_sessionId_recordedAt_idx"
  ON "session_observations" ("sessionId", "recordedAt" DESC);

-- listPublishedStories / shell cover: storyId + kind + pageId (null = cover)
CREATE INDEX IF NOT EXISTS "media_assets_storyId_kind_pageId_idx"
  ON "media_assets" ("storyId", "kind", "pageId");

-- listActiveStudentsForSession / userHasAnyStudentAccess (TERAPIS)
CREATE INDEX IF NOT EXISTS "therapist_assignments_therapistId_endedAt_idx"
  ON "therapist_assignments" ("therapistId", "endedAt");

-- listActiveStudentsForSession / userHasAnyStudentAccess (ORANG_TUA)
CREATE INDEX IF NOT EXISTS "parent_links_parentId_isActive_idx"
  ON "parent_links" ("parentId", "isActive");

-- listActiveCategories: isActive + sortOrder
CREATE INDEX IF NOT EXISTS "story_categories_isActive_sortOrder_idx"
  ON "story_categories" ("isActive", "sortOrder");
