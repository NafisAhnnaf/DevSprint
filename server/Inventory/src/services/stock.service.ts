import { formatDateForCache, formatDateForDb } from "../utils/formatDate.js";
import prisma from "../utils/prisma.js";
import { redis } from "../utils/redis.js";

export class StockService {
    private static readonly CACHE_TTL = 30; // seconds
    private static readonly CACHE_PREFIX = 'stock:';

    // ========== QUERY METHODS ==========

    static async getAvailableCount(forDate: string | Date): Promise<number> {
        const date = formatDateForDb(forDate);
        // console.log(date);
        const count = await prisma.stock.count({
            where: { forDate: date, status: "AVAILABLE" }
        });

        // Cache for next time
        await this.setCachedCount(date, count);
        return count;
    }

    static async getStockById(id: string) {
        return prisma.stock.findUnique({ where: { id } });
    }

    static async getStocksByDate(forDate: string) {
        const formattedDate = formatDateForDb(forDate);
        return prisma.stock.findMany({
            where: { forDate: formattedDate }
        });
    }

    // ========== MUTATION METHODS ==========

    static async createStocks(quantity: number, forDate: string): Promise<number> {
        const date = formatDateForDb(forDate);

        const result = await prisma.stock.createMany({
            data: Array.from({ length: quantity }, () => ({
                forDate: date,
                status: "AVAILABLE"
            }))
        });

        // Update cache with new total
        const totalCount = await prisma.stock.count({
            where: { forDate: date, status: "AVAILABLE" }
        });
        await this.setCachedCount(date, totalCount);

        return result.count;
    }

    static async reserveStock(forDate: string | Date): Promise<string> {
        const date = formatDateForDb(forDate);

        return prisma.$transaction(async (tx) => {
            const stock = await tx.stock.findFirst({
                where: { forDate: date, status: "AVAILABLE" },
                orderBy: { createdAt: "asc" }
            });

            if (!stock) throw new Error("OUT_OF_STOCK");

            const reserved = await tx.stock.update({
                where: { id: stock.id },
                data: { status: "RESERVED" }
            });

            // Decrement cache atomically
            await redis.decr(`${this.CACHE_PREFIX}${date}`);

            return reserved.id;
        });
    }

    static async useStock(stockId: string, forDate: string): Promise<void> {
        const date = formatDateForDb(forDate);

        await prisma.$transaction([
            prisma.stock.update({
                where: { id: stockId },
                data: { status: "USED" }
            }),
            // Cache already decremented during reservation, so no need to update here
        ]);
    }

    static async releaseStock(stockId: string, forDate: string | Date): Promise<void> {
        const date = formatDateForDb(forDate);

        // Update database first
        await prisma.stock.update({
            where: { id: stockId },
            data: { status: "AVAILABLE" }
        });

        await redis.incr(`${this.CACHE_PREFIX}${date}`).catch(() => {
            console.error(`Failed to increment cache for ${date}`);
        });
    }

    static async deleteStocksByDate(forDate: string): Promise<{ count: number }> {
        const date = formatDateForDb(forDate);

        const result = await prisma.stock.deleteMany({
            where: { forDate: date }
        });

        // Clear cache
        await redis.del(`${this.CACHE_PREFIX}${date}`);

        return result;
    }

    static async deleteStockById(id: string) {
        const stock = await prisma.stock.findUnique({ where: { id } });
        if (!stock) throw new Error("STOCK_NOT_FOUND");

        const result = await prisma.stock.delete({ where: { id } });

        // Invalidate cache for that date
        const date = formatDateForDb(stock.forDate);
        const count = await prisma.stock.count({
            where: { forDate: date, status: "AVAILABLE" }
        });
        await this.setCachedCount(date, count);

        return result;
    }

    // ========== PRIVATE CACHE METHODS ==========

    private static async getCachedCount(date: string | Date): Promise<number | null> {
        try {
            const cacheKey = `${this.CACHE_PREFIX}${formatDateForCache(date)}`;
            const cached = await redis.get(`${cacheKey}`) as string;
            return cached ? parseInt(cached) : null;
        } catch {
            return null; // Cache failure doesn't block the request
        }
    }

    private static async setCachedCount(date: string | Date, count: number): Promise<void> {
        try {
            const cacheKey = `${this.CACHE_PREFIX}${formatDateForCache(date)}`;
            console.log("From set Function", cacheKey);
            await redis.set(cacheKey, count.toString(), { expiration: { type: 'EX', value: this.CACHE_TTL } });
        } catch {
            // Cache failure doesn't block the request
        }
    }
}