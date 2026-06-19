-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_stock_id_fkey";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "stock_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "Stock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
