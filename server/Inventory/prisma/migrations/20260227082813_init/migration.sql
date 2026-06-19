/*
  Warnings:

  - You are about to drop the column `quantity` on the `Stock` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'USED');

-- DropIndex
DROP INDEX "Stock_forDate_idx";

-- DropIndex
DROP INDEX "Stock_forDate_key";

-- AlterTable
ALTER TABLE "Stock" DROP COLUMN "quantity",
ADD COLUMN     "status" "StockStatus" NOT NULL DEFAULT 'AVAILABLE',
ALTER COLUMN "forDate" SET DATA TYPE DATE;

-- CreateIndex
CREATE INDEX "Stock_id_idx" ON "Stock"("id");
