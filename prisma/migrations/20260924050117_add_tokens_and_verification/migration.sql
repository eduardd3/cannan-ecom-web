-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFICATION');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" TIMESTAMP(3),
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Token" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "TokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_tokenHash_key" ON "Token"("tokenHash");

-- CreateIndex
CREATE INDEX "Token_userId_type_createdAt_idx" ON "Token"("userId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
