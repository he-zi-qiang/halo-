-- AlterTable
ALTER TABLE "public"."Song" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER';
