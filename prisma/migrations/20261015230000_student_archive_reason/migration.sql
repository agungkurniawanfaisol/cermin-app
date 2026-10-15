-- Soft-delete (arsip) murid: simpan alasan + siapa/kapan untuk audit operasional.
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "archivedReason" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "archivedById" UUID;
