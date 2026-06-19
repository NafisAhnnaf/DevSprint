import prisma from "../utils/prisma.js";
import { StockService } from "./stock.service.js";
import { mq } from "../utils/mq.js";
import { formatDateForDb } from "../utils/formatDate.js";
import { OrderStatus } from "../generated/prisma/enums.js";

export class OrderService {
    static async getOrderById(id: string) {
        return prisma.order.findUnique({
            where: { id },
            include: { ticket: true, stock: true }
        });
    }

    static async getOrdersByUser(userId: string) {
        return prisma.order.findMany({
            where: { user_id: userId },
            // include: { ticket: true, stock: true }
        });
    }

    static async getAllOrders() {
        return prisma.order.findMany({
            include: { ticket: true, stock: true }
        });
    }

    static async getUserOrderForDate(userId: string, forDate: string): Promise<boolean> {
        const date = formatDateForDb(forDate);
        const order = await prisma.order.findFirst({
            where: { user_id: userId, forDate: date }
        });
        return !!order;
    }


    static async createOrder(userId: string, forDate: string) {
        const date = formatDateForDb(forDate);

        // Check if user already ordered today
        const orderCount = await prisma.order.count({
            where: {
                user_id: userId
            }
        });

        if (orderCount > 5) {
            throw { code: 'P2002', message: 'Already ordered 5 times today' };
        }

        const availableCount = await StockService.getAvailableCount(date);
        if (availableCount === 0) {
            throw new Error("OUT_OF_STOCK");
        }

        const order = await prisma.$transaction(async (tx) => {
            const stockId = await StockService.reserveStock(date);
            const newOrder = await tx.order.create({
                data: {
                    user_id: userId,
                    stock_id: stockId,
                    status: "PENDING",
                    forDate: date
                }
            });

            return newOrder;
        });

        // Publish event after successful transaction
        await mq.publish("order.created", {
            userId: order.user_id,
            orderId: order.id,
            forDate: date
        });

        return order;
    }

    static async markInKitchen(orderId: string) {
        return this.updateOrderStatus(orderId, "PENDING", "order.in_kitchen");
    }

    static async markCompleted(orderId: string) {
        return this.updateOrderStatus(orderId, "COMPLETED", "order.completed");
    }

    static async markFailed(orderId: string, reason?: string) {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { stock_id: true, forDate: true }
        });

        if (!order) throw new Error("ORDER_NOT_FOUND");

        // Release stock back to available
        await StockService.releaseStock(order.stock_id, order.forDate);

        return this.updateOrderStatus(orderId, "FAILED", "order.failed", { reason });
    }

    static async markCancelled(orderId: string, reason?: string) {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { stock_id: true, forDate: true }
        });

        if (!order) throw new Error("ORDER_NOT_FOUND");

        // Release stock back to available
        await StockService.releaseStock(order.stock_id, order.forDate);

        return this.updateOrderStatus(orderId, "CANCELLED", "order.cancelled", { reason });
    }

    static async deleteOrder(id: string) {
        const order = await prisma.order.findUnique({
            where: { id },
            select: { stock_id: true, forDate: true, status: true }
        });

        if (!order) throw new Error("ORDER_NOT_FOUND");

        // If order was pending/failed/cancelled, release stock
        if (order.status === "PENDING") {
            await StockService.releaseStock(order.stock_id, order.forDate);
        }

        return prisma.order.delete({ where: { id } });
    }

    // ========== PRIVATE HELPER METHODS ==========

    private static async updateOrderStatus(orderId: string, status: OrderStatus, event: string, extraData = {}) {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { user_id: true }
        });

        if (!order) throw new Error("ORDER_NOT_FOUND");

        const updated = await prisma.order.update({
            where: { id: orderId },
            data: { status },
            select: { user_id: true, id: true }
        });

        await mq.publish(event, {
            userId: updated.user_id,
            orderId,
            ...extraData
        });

        return updated;
    }
}