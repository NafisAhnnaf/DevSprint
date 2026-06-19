// middlewares/chaos.middleware.ts
import { Request, Response, NextFunction } from 'express';

let isKilled = false;

export const chaosMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/chaos/kill' && req.method === 'POST') {
        return next();
    }

    if (isKilled) {
        console.log(`Request blocked - service is killed: ${req.method} ${req.path}`);
        return res.status(503).json({
            message: "Service temporarily unavailable",
            status: "down"
        });
    }
    next();
};

export const chaosToggleHandler = (req: Request, res: Response) => {
    isKilled = !isKilled;
    const status = isKilled ? "killed" : "restored";
    console.log(`Chaos mode: ${status}`);
    return res.status(200).json({
        message: `Service ${status} successfully`,
        status: isKilled ? "down" : "up"
    });
};

export const getChaosState = () => isKilled;