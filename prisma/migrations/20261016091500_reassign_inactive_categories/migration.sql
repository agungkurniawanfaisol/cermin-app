-- Reassign any stories currently associated with inactive categories to 'Bergiliran'
DO $$
DECLARE
  v_bergiliran_id UUID;
  v_kemenangan_id UUID;
BEGIN
  SELECT id INTO v_bergiliran_id FROM "story_categories" WHERE "name" = 'Bergiliran' LIMIT 1;
  SELECT id INTO v_kemenangan_id FROM "story_categories" WHERE "name" = 'Menerima Kemenangan dan Kekalahan' LIMIT 1;

  IF v_bergiliran_id IS NOT NULL THEN
    UPDATE "stories"
    SET "categoryId" = v_bergiliran_id
    WHERE "categoryId" IN (
      SELECT id FROM "story_categories"
      WHERE "name" NOT IN ('Bergiliran', 'Menerima Kemenangan dan Kekalahan')
    );
  END IF;
END $$;

-- Ensure both target categories are active with correct description and sortOrder
UPDATE "story_categories"
SET "isActive" = true,
    "description" = 'Antri dan bergiliran saat bermain bersama teman sebaya',
    "sortOrder" = 1
WHERE "name" = 'Bergiliran';

UPDATE "story_categories"
SET "isActive" = true,
    "description" = 'Mengelola emosi dan merespons hasil permainan secara positif',
    "sortOrder" = 2
WHERE "name" = 'Menerima Kemenangan dan Kekalahan';

-- Deactivate all other categories
UPDATE "story_categories"
SET "isActive" = false
WHERE "name" NOT IN ('Bergiliran', 'Menerima Kemenangan dan Kekalahan');
