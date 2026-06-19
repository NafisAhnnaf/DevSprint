import { Request, Response } from "express";
import { OrderService } from "../services/order.service.js";

export class OrderController {
    static async getOrderByUser(req: Request, res: Response) {
        try {
            const userId = req.headers.user_id;
            if (!userId || typeof userId !== 'string') {
                return res.status(400).json({ message: "Missing order id" });
            }
            const orders = await OrderService.getOrdersByUser(userId);

            if (orders.length < 1) {
                return res.status(404).json({ message: "Order not found" });
            }

            return res.status(200).json({
                payload: { orders },
                message: "Order found for user"
            });
        } catch (err: any) {
            return this.handleError(res, err, "Failed to fetch order for user");
        }
    }
    static async getOrderById(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id || typeof id !== 'string') {
                return res.status(400).json({ message: "Missing order id" });
            }

            const order = await OrderService.getOrderById(id);

            if (!order) {
                return res.status(404).json({ message: "Order not found" });
            }

            return res.status(200).json({
                payload: { order },
                message: "Order found"
            });
        } catch (err: any) {
            return this.handleError(res, err, "Failed to fetch order");
        }
    }

    static async getAllOrders(req: Request, res: Response) {
        try {
            const orders = await OrderService.getAllOrders();

            return res.status(200).json({
                payload: { orders },
                message: orders.length ? "Orders found" : "No orders found"
            });
        } catch (err: any) {
            return this.handleError(res, err, "Failed to fetch orders");
        }
    }

    static async getUserOrders(req: Request, res: Response) {
        try {
            const userId = req.headers.user_id as string;

            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const orders = await OrderService.getOrdersByUser(userId);

            return res.status(200).json({
                payload: { orders },
                message: "User orders retrieved"
            });
        } catch (err: any) {
            return this.handleError(res, err, "Failed to fetch user orders");
        }
    }

    // ========== CREATE METHODS ==========

    static async createOrder(req: Request, res: Response) {
        try {
            const userId = req.headers.user_id as string;
            const forDate = new Date().toISOString().split('T')[0];

            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const order = await OrderService.createOrder(userId, forDate);

            return res.status(201).json({
                payload: { order },
                message: "Order created successfully"
            });

        } catch (err: any) {
            console.log(err);
            if (err.message === "OUT_OF_STOCK") {
                return res.status(409).json({ message: "Out of stock" });
            }
            if (err.code === 'P2002') {

                return res.status(409).json({ message: "You have already ordered 5 times today" });
            }
            return this.handleError(res, err, "Failed to create order");
        }
    }

    // ========== UPDATE METHODS ==========

    static async cancelOrder(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = req.headers.user_id as string;
            const { reason } = req.body;

            if (!id || typeof id !== 'string') {
                return res.status(400).json({ message: "Missing order id" });
            }

            const order = await OrderService.markCancelled(id, reason);

            return res.status(200).json({
                payload: { order },
                message: "Order cancelled successfully"
            });
        } catch (err: any) {
            if (err.message === "ORDER_NOT_FOUND") {
                return res.status(404).json({ message: "Order not found" });
            }
            return this.handleError(res, err, "Failed to cancel order");
        }
    }

    // ========== DELETE METHODS ==========

    static async deleteOrder(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id || typeof id !== 'string') {
                return res.status(400).json({ message: "Missing order id" });
            }

            const deleted = await OrderService.deleteOrder(id);

            return res.status(200).json({
                payload: { order: deleted },
                message: "Order deleted successfully"
            });
        } catch (err: any) {
            if (err.message === "ORDER_NOT_FOUND") {
                return res.status(404).json({ message: "Order not found" });
            }
            return this.handleError(res, err, "Failed to delete order");
        }
    }

    // ========== PRIVATE HELPERS ==========

    private static handleError(res: Response, err: any, defaultMessage: string) {
        console.error(`${defaultMessage}:`, err);
        return res.status(500).json({
            message: defaultMessage,
            error: err.message
        });
    }
}