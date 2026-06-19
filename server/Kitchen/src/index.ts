import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { mq } from './utils/mq.js';
import { connectRedis, redis } from './utils/redis.js';
import prisma from './utils/prisma.js';
import { KitchenConsumer } from './consumers/kitchen.consumer.js';
import { HealthCheck } from './utils/health.js';
import { metricsHandler, metricsMiddleware } from './utils/metrics.js';
import { chaosMiddleware, chaosToggleHandler } from './middlewares/chaos.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8008;

// Initialize HealthCheck
const healthCheck = new HealthCheck('kitchen');

// Redis Init:
connectRedis().catch((err) => {
    console.error("Failed to connect to Redis:", err);
});
healthCheck.setRedisClient(redis);

// Set Prisma client
healthCheck.setPrismaClient(prisma);

// Set RabbitMQ URL
healthCheck.setRabbitMQUrl(process.env.RABBITMQ_URL || "amqp://IUT_Dhongorsho:Dhongorsho123@localhost:5672");

// Middleware
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware); // Add metrics middleware
app.use('/chaos/kill', chaosToggleHandler);
app.use(chaosMiddleware)

// Health endpoints
app.get('/health', healthCheck.healthHandler);
app.get('/health/live', healthCheck.livenessHandler);
app.get('/health/ready', healthCheck.readinessHandler);

// Metrics endpoint
app.get('/metrics', metricsHandler);

// RabbitMQ Init and start consumer after connection
mq.connect()
    .then(() => KitchenConsumer())
    .catch((err) => {
        console.error("Failed to connect RabbitMQ or start consumer:", err);
    });

// Basic route
app.get('/', (req, res) => {
    res.status(200).json({
        service: 'kitchen',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, (err) => {
    if (err) console.log(err);
    console.log(`Kitchen Service is running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log(`Metrics available at http://localhost:${PORT}/metrics`);
});