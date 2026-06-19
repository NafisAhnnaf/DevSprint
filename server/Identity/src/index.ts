import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminRoutes from './routes/admin.routes.js';
import prisma from './utils/prisma.js';
import { HealthCheck } from './utils/health.js';
import { metricsHandler, metricsMiddleware } from './utils/metrics.js';
import { chaosMiddleware, chaosToggleHandler } from './middlewares/chaos.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8006;

// Initialize HealthCheck
const healthCheck = new HealthCheck('identity');

// Set Prisma client
healthCheck.setPrismaClient(prisma);

// Middleware
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware); // Add metrics middleware

// Health endpoints
app.get('/health', healthCheck.healthHandler);
app.get('/health/live', healthCheck.livenessHandler);
app.get('/health/ready', healthCheck.readinessHandler);

// Metrics endpoint
app.get('/metrics', metricsHandler);

app.use('/chaos/kill', chaosToggleHandler);
app.use(chaosMiddleware)

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/admin', adminRoutes);

// Basic route
app.get('/', (req, res) => {
    res.status(200).json({
        service: 'identity',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, (err) => {
    if (err) console.log(err);
    console.log(`Identity Service is running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log(`Metrics available at http://localhost:${PORT}/metrics`);
});