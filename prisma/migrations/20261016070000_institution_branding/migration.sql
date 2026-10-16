-- CreateTable
CREATE TABLE "institution_branding" (
    "id" VARCHAR(32) NOT NULL,
    "logoKey" TEXT,
    "logoMime" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,

    CONSTRAINT "institution_branding_pkey" PRIMARY KEY ("id")
);

-- Seed singleton row
INSERT INTO "institution_branding" ("id", "logoKey", "logoMime", "updatedAt", "updatedById")
VALUES ('default', NULL, NULL, CURRENT_TIMESTAMP, NULL);
