import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { mq } from './utils/mq.js';
import { connectRedis, redis } from './utils/redis.js';
import { NotificationConsumer } from './consumers/notification.consumer.js';
import notificationRoutes from './routes/notification.route.js';
import { metricsHandler, metricsMiddleware } from './utils/metrics.js';
import { HealthCheck } from './utils/health.js';
import { chaosMiddleware, chaosToggleHandler } from './middlewares/chaos.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8009;

// Initialize HealthCheck
const healthCheck = new HealthCheck('notification');



// Set RabbitMQ URL (since your mq wrapper needs URL)
healthCheck.setRabbitMQUrl(process.env.RABBITMQ_URL || "amqp://IUT_Dhongorsho:Dhongorsho123@localhost:5672");

// Middleware
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware); // Add metrics middleware
app.use('/chaos/kill', chaosToggleHandler);
app.use(chaosMiddleware)

app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// RabbitMQ Init and start consumer after connection
mq.connect()
    .then(() => {
        console.log("RabbitMQ connected successfully");
        return NotificationConsumer();
    })
    .catch((err) => {
        console.error("Failed to connect RabbitMQ or start consumer:", err);
    });

healthCheck.setMQWrapper(mq);
// Redis Init:
connectRedis().catch((err) => {
    console.error("Failed to connect to Redis:", err);
});

healthCheck.setRedisClient(redis);
// Routes
app.use('/', notificationRoutes);

// Basic route
// Health endpoints (place these BEFORE routes)
app.get('/health', healthCheck.healthHandler);
app.get('/health/live', healthCheck.livenessHandler);
app.get('/health/ready', healthCheck.readinessHandler);

// Metrics endpoint
app.get('/metrics', metricsHandler);

app.get('/', (req, res) => {
    res.status(200).json({
        service: 'notification',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, (err) => {
    if (err) console.log(err);
    console.log(`Notification Service is running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log(`Metrics available at http://localhost:${PORT}/metrics`);
});