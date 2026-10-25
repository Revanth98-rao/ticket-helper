-- AlterTable
ALTER TABLE "ticket" ADD COLUMN IF NOT EXISTS "autoResolved" BOOLEAN NOT NULL DEFAULT false;

