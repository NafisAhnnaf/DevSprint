import type { Request, Response, NextFunction } from "express";
import { decodeJwt } from "../utils/jwt.js";
import { redis } from "../utils/redis.js";
import axios from "axios";
import { formatDateForCache, formatDateForDb } from "../utils/formatDate.js";


export const stockGuard = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        console.log(`Stock guard checking for ${req.method} ${req.path}`);
        if (req.path === "/stock") {
            console.log("Bypassing stock check for stock creation endpoint");
            return next();
        }
        console.log("Checking stock availability...");
        const today = new Date().toISOString();
        const date = formatDateForCache(today);
        const cacheKey = `stock:${date}`;
        console.log("Cache key for stock:", cacheKey);

        let stockData: string | null = null;

        try {
            stockData = await redis.get(cacheKey) as string;
            // console.log("Stock data from cache:", stockData);
        } catch (redisError: any) {
            console.error("Redis error:", redisError.message);
        }

        if (stockData) {
            const qty = JSON.parse(stockData);
            console.log("Stock quantity from cache:", qty);
            if (qty > 0) return next();
        }

        // Fallback to Inventory service
        console.log("Fallback to Inventory service")
        try {
            const inventoryUrl =
                process.env.INVENTORY_SERVICE_URL || "http://dev-sprint-inventory:8007";
            const response = await axios.get(`${inventoryUrl}/stock`);
            // console.log(response.data);
            const qty = response.data?.payload?.stock?.quantity;
            console.log(qty);
            if (qty > 0) {
                return next();
            }
            return res.status(409).json({ message: "Insufficient stock" });
        } catch (err: any) {
            if (err.response.status === 404) {
                return res.status(404).json({ message: "Stock Unavailable" });
            }
            console.error("Inventory fetch failed:", err.message);
            return res.status(503).json({ message: "Inventory unavailable", error: err.message });
        }
    } catch (error: any) {
        console.error(error.message);
        return res.status(500).json({ message: "Internal error" });
    }
};