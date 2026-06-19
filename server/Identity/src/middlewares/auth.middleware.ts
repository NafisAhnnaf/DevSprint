import type { Request, Response, NextFunction } from "express";
import { decodeJwt } from "../utils/jwt.js";
import prisma from "../utils/prisma.js";

export const adminGuard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let userId = null;
        if (req.headers.user_id) {
            userId = req.headers.user_id;
        }
        else {
            return res.status(403).json({ message: "Unauthorized. Access Denied" });
        }
        if (userId && userId.length > 0) {

            // console.log(userId);
            if (typeof userId === 'string') {
                const response = await prisma.admin.findUnique({
                    where: { user_id: userId }
                })
                // console.log(response);
                if (response) {
                    req.headers.user_id = userId;
                    req.headers.admin_id = response.id;
                    next();
                }
                else return res.status(403).json({ message: "Admin access required" });
            }
        }
    } catch (error) {
        console.log(error.message);
        return res.status(401).json({ message: error.message });
    }
}