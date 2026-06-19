-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'STOCK_VERIFIED', 'IN_KITCHEN', 'READY', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "Stock" (
    "id" UUID NOT NULL,
    "forDate" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "issuedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRedeemed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stock_forDate_key" ON "Stock"("forDate");

-- CreateIndex
CREATE INDEX "Stock_forDate_idx" ON "Stock"("forDate");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
