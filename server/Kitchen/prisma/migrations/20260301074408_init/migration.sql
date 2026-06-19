/*
  Warnings:

  - A unique constraint covering the columns `[orderId]` on the table `Job` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Job_orderId_key" ON "Job"("orderId");
