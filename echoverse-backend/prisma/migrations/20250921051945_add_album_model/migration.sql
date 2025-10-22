/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `coverUrl` on the `Playlist` table. All the data in the column will be lost.
  - You are about to drop the column `album` on the `Song` table. All the data in the column will be lost.
  - You are about to drop the column `lyrics` on the `Song` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `UserFavorite` table. All the data in the column will be lost.
  - Made the column `coverUrl` on table `Song` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_songId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlaylistSong" DROP CONSTRAINT "PlaylistSong_playlistId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlaylistSong" DROP CONSTRAINT "PlaylistSong_songId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserFavorite" DROP CONSTRAINT "UserFavorite_songId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserFavorite" DROP CONSTRAINT "UserFavorite_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Comment" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "public"."Playlist" DROP COLUMN "coverUrl";

-- AlterTable
ALTER TABLE "public"."Song" DROP COLUMN "album",
DROP COLUMN "lyrics",
ADD COLUMN     "albumId" INTEGER,
ALTER COLUMN "duration" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "coverUrl" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."UserFavorite" DROP COLUMN "createdAt";

-- CreateTable
CREATE TABLE "public"."Album" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "coverUrl" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Album" ADD CONSTRAINT "Album_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Song" ADD CONSTRAINT "Song_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "public"."Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlaylistSong" ADD CONSTRAINT "PlaylistSong_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "public"."Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlaylistSong" ADD CONSTRAINT "PlaylistSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "public"."Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserFavorite" ADD CONSTRAINT "UserFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserFavorite" ADD CONSTRAINT "UserFavorite_songId_fkey" FOREIGN KEY ("songId") REFERENCES "public"."Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_songId_fkey" FOREIGN KEY ("songId") REFERENCES "public"."Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
