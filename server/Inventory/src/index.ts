import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { mq } from './utils/mq.js';
import orderRoutes from './routes/order.routes.js';
import stockRoutes from './routes/stock.routes.js';
import { connectRedis, redis } from './utils/redis.js';
import prisma from './utils/prisma.js';
import { InventoryConsumer } from './consumers/inventory.consumer.js';
import { HealthCheck } from './utils/health.js';
import { metricsHandler, metricsMiddleware } from './utils/metrics.js';
import { chaosMiddleware, chaosToggleHandler } from './middlewares/chaos.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8007;


connectRedis().catch((err) => {
    console.error("Failed to connect to Redis:", err);
});

const healthCheck = new HealthCheck('inventory');
healthCheck.setRedisClient(redis);
healthCheck.setPrismaClient(prisma);
healthCheck.setRabbitMQUrl(process.env.RABBITMQ_URL || "amqp://IUT_Dhongorsho:Dhongorsho123@localhost:5672");

app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

app.use('/chaos/kill', chaosToggleHandler);
app.use(chaosMiddleware)


app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

mq.connect()
    .then(() => InventoryConsumer())
    .catch((err) => {
        console.error("Failed to connect RabbitMQ or start consumer:", err);
    });


app.use('/order', orderRoutes);
app.use('/stock', stockRoutes);

app.get('/health', healthCheck.healthHandler);
app.get('/health/live', healthCheck.livenessHandler);
app.get('/health/ready', healthCheck.readinessHandler);

app.get('/metrics', metricsHandler);

app.get('/', (req, res) => {
    res.status(200).json({
        service: 'inventory',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, (err) => {
    if (err) console.log(err);
    console.log(`Inventory Service is running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log(`Metrics available at http://localhost:${PORT}/metrics`);
});