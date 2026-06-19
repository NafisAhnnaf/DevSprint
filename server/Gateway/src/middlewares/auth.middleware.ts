import type { Request, Response, NextFunction } from "express";
import { decodeJwt } from "../utils/jwt.js";
import { redis } from "../utils/redis.js";
import axios from "axios";



export const userGuard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const token = authHeader.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });

        const userId = decodeJwt(token);
        if (!userId || typeof userId !== "string") {
            return res.status(401).json({ message: "Invalid token" });
        }

        // Check Redis cache first
        let userData: string | null = null;

        try {
            userData = await redis.get(`user:${userId}`) as string;
            // console.log("User data from cache:", JSON.parse(userData));
        } catch (redisError: any) {
            console.error("Redis error:", redisError.message);
            // DO NOT return — just continue
        }

        if (userData) {
            console.log("From cache user ID: ", JSON.parse(userData).id)
            req.headers.user_id = JSON.parse(userData).id;
            return next();
        }

        try {
            const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || "http://dev-sprint-identity:4002";
            const response = await axios.get(`${identityServiceUrl}/users/${userId}`);

            const userDataFromSvc = response?.data?.payload?.user;
            if (!userDataFromSvc) {
                return res.status(401).json({ message: "Login required" });
            }
            console.log("From Identity Service", userDataFromSvc.id);
            req.headers.user_id = userDataFromSvc.id;

            // Try caching in Redis, but don't block the request
            try {
                await redis.set(`user:${userId}`, JSON.stringify(userDataFromSvc), { expiration: { type: "EX", value: 5 * 60 } });
            } catch (redisError: any) {
                console.error("Redis set failed:", redisError.message);
            }

            next();
        } catch (err: any) {
            console.error("Identity service fetch failed:", err);
            if (err.response.status === 404) {
                return res.status(401).json({ message: "Invalid token, login required" });
            }
            if (err.response.status === 500) {
                return res.status(503).json({
                    message: "Identity service unavailable",
                    error: err.message,
                    status: err.status
                });
            }
        }

    } catch (error: any) {
        console.error(error.message);
        return res.status(401).json({ message: error.message });
    }
};

export const adminGuard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const token = authHeader.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });

        const userId = decodeJwt(token);
        if (!userId || typeof userId !== "string") {
            return res.status(401).json({ message: "Invalid token" });
        }

        // Check Redis cache first
        let adminData: string | null = null;

        try {
            adminData = await redis.get(`admin:${userId}`) as string;
            // console.log("User data from cache:", JSON.parse(userData));
        } catch (redisError: any) {
            console.error("Redis error:", redisError.message);
            // DO NOT return — just continue
        }

        if (adminData) {
            console.log("From cache admin ID: ", JSON.parse(adminData).id)
            req.headers.user_id = userId;
            req.headers.admin_id = JSON.parse(adminData).id
            return next();
        }

        try {
            const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || "http://dev-sprint-identity:4002";
            const response = await axios.get(`${identityServiceUrl}/admin/${userId}`);

            const adminDataFromSvc = response?.data?.payload?.admin;
            if (!adminDataFromSvc) {
                return res.status(403).json({ message: "Admin privilege required!" });
            }
            console.log("From Identity Service", adminDataFromSvc.id);
            req.headers.user_id = userId;
            req.headers.admin_id = adminDataFromSvc.id;

            // Try caching in Redis, but don't block the request
            try {
                await redis.set(`admin:${userId}`, JSON.stringify(adminDataFromSvc), { expiration: { type: "EX", value: (5 * 60) } }); // Cache for 1 hour
            } catch (redisError: any) {
                console.error("Redis set failed:", redisError.message);
            }

            next();
        } catch (err: any) {
            console.error("Identity service fetch failed:", err.message, err.status);
            if (err.response.status === 404) {
                return res.status(403).json({ message: "Not an admin; admin privilege required" });
            }
            else if (err.response.status === 403) {
                return res.status(403).json({ message: "Not an admin; admin privilege required" });
            }
            else if (err.response.status === 500) {
                return res.status(503).json({
                    message: "Identity service unavailable",
                    error: err.message,
                    status: err.status
                });
            }
        }

    } catch (error: any) {
        console.error(error.message);
        return res.status(403).json({ message: error.message });
    }
};