import dotenv from "dotenv";
dotenv.config();
import express from 'express';
import cors from 'cors';
import { metricsHandler, metricsMiddleware } from './utils/metrics.js';
import { HealthCheck } from './utils/health.js';
import { createProxyMiddleware } from "http-proxy-middleware";
import { adminGuard, userGuard } from './middlewares/auth.middleware.js';
import { connectRedis, redis } from './utils/redis.js';
import { stockGuard } from './middlewares/stock.middleware.js';
import { identityProxy, inventoryOrderProxy, inventoryOthersProxy, inventoryStockProxy, kitchenProxy, notificationProxy } from "./middlewares/proxy.middleware.js";
import { chaosMiddleware, chaosToggleHandler, chaosLoadTestHandler } from "./middlewares/chaos.middleware.js";


const app = express();
const PORT = process.env.PORT || 8005;


// HealthCheck class init:
const healthCheck = new HealthCheck('Gateway');

healthCheck.setProxyUrls({
    identity: process.env.IDENTITY_SERVICE_URL || "http://dev-sprint-identity:4002",
    inventory: process.env.INVENTORY_SERVICE_URL || "http://dev-sprint-inventory:4003",
    kitchen: process.env.KITCHEN_SERVICE_URL || "http://dev-sprint-kitchen:4004",
    notification: process.env.NOTIFICATION_SERVICE_URL || "http://dev-sprint-notification:4005"
});


// Redis Startup:
connectRedis().catch((err) => {
    console.error("Failed to connect to Redis:", err);
});


healthCheck.setRedisClient(redis);



// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
}));
app.use(metricsMiddleware);

// Intercept chaos load-test and kill endpoints
app.post("/api/chaos/load-test", chaosLoadTestHandler);
app.post('/chaos/kill', chaosToggleHandler);

app.use(chaosMiddleware);

// Logger Middleware:
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

app.use("/api/identity", identityProxy);
app.use(
    "/api/inventory/order",
    userGuard,
    stockGuard,
    inventoryOrderProxy
);
app.use(
    "/api/inventory/stock",
    // adminGuard,
    userGuard,
    inventoryStockProxy
);
app.use(
    "/api/inventory",
    // adminGuard,
    userGuard,
    inventoryOthersProxy
);
app.use(
    "/api/kitchen",
    userGuard,
    kitchenProxy
);
app.use(
    "/api/notification",
    userGuard,
    notificationProxy
);
// Internal endpoints
app.get('/', (req, res) => {
    res.status(200).json({ message: "Gateway Service is up and running" });
});


// Health endpoints
app.get('/health', healthCheck.healthHandler);
app.get('/health/live', healthCheck.livenessHandler);
app.get('/health/ready', healthCheck.readinessHandler);



// Metrics endpoint
app.get('/metrics', metricsHandler);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
    res.status(err.status || 500).json({ message: err.message || 'Internal Server Error', stack: err.stack });
});

app.listen(PORT, () => {
    console.log(`Gateway Service is running on port ${PORT}`);
}); 