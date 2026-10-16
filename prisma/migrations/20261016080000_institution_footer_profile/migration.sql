-- AlterTable: profil footer lembaga (nama, alamat, sosial)
ALTER TABLE "institution_branding" ADD COLUMN IF NOT EXISTS "name" VARCHAR(200);
ALTER TABLE "institution_branding" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "institution_branding" ADD COLUMN IF NOT EXISTS "websiteUrl" VARCHAR(500);
ALTER TABLE "institution_branding" ADD COLUMN IF NOT EXISTS "instagramUrl" VARCHAR(500);
ALTER TABLE "institution_branding" ADD COLUMN IF NOT EXISTS "facebookUrl" VARCHAR(500);
ALTER TABLE "institution_branding" ADD COLUMN IF NOT EXISTS "youtubeUrl" VARCHAR(500);
ALTER TABLE "institution_branding" ADD COLUMN IF NOT EXISTS "whatsappUrl" VARCHAR(500);
