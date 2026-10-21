-- Soft-delete / disable: simpan alasan + aktor (query: list disabled/archived).

-- User: nonaktif dengan jejak
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "disabledReason" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "disabledById" UUID;

ALTER TABLE "users"
  DROP CONSTRAINT IF EXISTS "users_disabledById_fkey";
ALTER TABLE "users"
  ADD CONSTRAINT "users_disabledById_fkey"
  FOREIGN KEY ("disabledById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Story: arsip dengan jejak
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "archivedReason" TEXT;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "archivedById" UUID;

ALTER TABLE "stories"
  DROP CONSTRAINT IF EXISTS "stories_archivedById_fkey";
ALTER TABLE "stories"
  ADD CONSTRAINT "stories_archivedById_fkey"
  FOREIGN KEY ("archivedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
