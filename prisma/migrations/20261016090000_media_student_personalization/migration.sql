-- Personalized story-page images: optional studentId on media_assets.
ALTER TABLE "media_assets" ADD COLUMN IF NOT EXISTS "studentId" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_studentId_fkey'
  ) THEN
    ALTER TABLE "media_assets"
      ADD CONSTRAINT "media_assets_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "students"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "media_assets_pageId_studentId_idx"
  ON "media_assets"("pageId", "studentId");

-- One personalized IMAGE per (page, student).
CREATE UNIQUE INDEX IF NOT EXISTS "media_assets_page_student_image_unique"
  ON "media_assets"("pageId", "studentId")
  WHERE kind = 'IMAGE' AND "studentId" IS NOT NULL AND "pageId" IS NOT NULL;

-- Keep only Bergiliran + Menerima Kemenangan dan Kekalahan active.
UPDATE "story_categories"
SET "isActive" = false
WHERE "name" NOT IN (
  'Bergiliran',
  'Menerima Kemenangan dan Kekalahan'
);
