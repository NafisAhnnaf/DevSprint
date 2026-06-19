// redis.client.ts
import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://dev-sprint-redis:6379";

export const redis = createClient({ url: REDIS_URL });

redis.on("error", (err) => console.error("Redis Error:", err));
redis.on("connect", () => console.log("Redis connected"));
redis.on("ready", () => console.log("Redis ready"));

export const connectRedis = async () => {
    try {
        await redis.connect();
        console.log("Redis client connected successfully");
    } catch (err) {
        console.error("Redis connection failed:", err);
    }
};