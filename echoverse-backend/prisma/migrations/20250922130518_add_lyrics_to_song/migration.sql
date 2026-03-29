-- DropForeignKey
ALTER TABLE "public"."Song" DROP CONSTRAINT "Song_albumId_fkey";

-- AlterTable
ALTER TABLE "public"."Song" ADD COLUMN     "lyrics" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Song" ADD CONSTRAINT "Song_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "public"."Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
