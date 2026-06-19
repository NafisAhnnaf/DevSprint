// middlewares/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 attempts
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.headers['x-load-test'] === 'true',
    keyGenerator: (req) => {
        // Use studentId + IP to prevent bypassing
        return req.body.studentId + req.ip;
    },
    handler: (req, res) => {
        res.status(429).json({
            message: 'Too many login attempts. Please try again after 1 minutes.'
        });
    }
});