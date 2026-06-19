import { Request, Response } from "express";
import { StockService } from "../services/stock.service.js";
import { formatDateForDb } from "../utils/formatDate.js";

export class StockController {
    // ========== GET METHODS ==========

    static async getTodaysStockQty(req: Request, res: Response) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const qty = await StockService.getAvailableCount(today);

            return res.status(200).json({
                payload: { stock: { quantity: qty } },
                message: qty > 0 ? "Stock available" : "No stock available"
            });
        } catch (err: any) {
            return this.handleError(res, err, "Failed to get stock count");
        }
    }

    static async getStockById(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id || typeof id !== 'string') {
                return res.status(400).json({ message: "Missing stock id" });
            }

            const stock = await StockService.getStockById(id);

            if (!stock) {
                return res.status(404).json({ message: "Stock not found" });
            }

            return res.status(200).json({
                payload: { stock },
                message: "Stock found"
            });
        } catch (err: any) {
            return this.handleError(res, err, "Failed to get stock");
        }
    }

    static async getStocksByDate(req: Request, res: Response) {
        try {
            const { forDate } = req.params;

            if (!forDate || typeof forDate !== 'string') {
                return res.status(400).json({ message: "Missing date" });
            }

            const stocks = await StockService.getStocksByDate(forDate);

            return res.status(200).json({
                payload: { stocks },
                message: stocks.length ? "Stocks found" : "No stocks found"
            });
        } catch (err: any) {
            return this.handleError(res, err, "Failed to get stocks");
        }
    }

    // ========== CREATE METHODS ==========

    static async createStock(req: Request, res: Response) {
        try {
            const { quantity, forDate } = req.body;

            if (!quantity || !forDate) {
                return res.status(400).json({
                    message: "quantity and forDate are required"
                });
            }

            if (quantity < 1) {
                return res.status(400).json({
                    message: "Quantity must be at least 1"
                });
            }

            const created = await StockService.createStocks(quantity, forDate);

            return res.status(201).json({
                payload: { count: created },
                message: `Created ${created} stock entries`
            });
        } catch (err: any) {
            return this.handleError(res, err, "Failed to create stock");
        }
    }

    // ========== DELETE METHODS ==========

    static async deleteStocksByDate(req: Request, res: Response) {
        try {
            const { forDate } = req.params;

            if (!forDate || typeof forDate !== 'string') {
                return res.status(400).json({ message: "Missing forDate" });
            }

            const result = await StockService.deleteStocksByDate(forDate);

            return res.status(200).json({
                payload: { deleted: result.count },
                message: `Deleted ${result.count} stock entries`
            });
        } catch (err: any) {
            return this.handleError(res, err, "Failed to delete stocks");
        }
    }

    static async deleteStockById(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id || typeof id !== 'string') {
                return res.status(400).json({ message: "Missing stock id" });
            }

            const result = await StockService.deleteStockById(id);

            return res.status(200).json({
                payload: { stock: result },
                message: "Stock deleted successfully"
            });
        } catch (err: any) {
            if (err.message === "STOCK_NOT_FOUND") {
                return res.status(404).json({ message: "Stock not found" });
            }
            return this.handleError(res, err, "Failed to delete stock");
        }
    }

    // ========== PRIVATE HELPERS ==========

    private static handleError(res: Response, err: any, defaultMessage: string) {
        console.error(`${defaultMessage}:`, err);

        if (err.code === 'P2007') {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        return res.status(500).json({
            message: defaultMessage,
            error: err.message
        });
    }
}