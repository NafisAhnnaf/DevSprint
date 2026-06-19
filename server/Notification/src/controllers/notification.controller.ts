import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service.js';

export const registerOrderStream = async (req: Request, res: Response) => {
    const userId = req.headers.user_id as string;

    if (!userId) {
        return res.status(401).json({ message: 'User ID missing' });
    }
    try {
        await notificationService.registerSession(req, res, userId);
        await notificationService.hydrateUserOrders(userId);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to initialize SSE', error: err.message });
    }
};