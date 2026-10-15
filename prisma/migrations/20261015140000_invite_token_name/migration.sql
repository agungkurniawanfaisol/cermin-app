-- AlterTable
ALTER TABLE "invite_tokens" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "invite_tokens" ALTER COLUMN "name" DROP DEFAULT;
