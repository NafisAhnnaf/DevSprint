import amqp from 'amqplib';
export class HealthCheck {
    serviceName;
    redisClient;
    prismaClient;
    rabbitmqUrl;
    constructor(serviceName) {
        this.serviceName = serviceName;
    }
    // Set Redis client if service uses Redis
    setRedisClient(redis) {
        this.redisClient = redis;
    }
    // Set Prisma client if service uses database
    setPrismaClient(pris) {
        this.prismaClient = pris;
    }
    // Set RabbitMQ URL if service uses RabbitMQ
    setRabbitMQUrl(url) {
        this.rabbitmqUrl = url;
    }
    // Check Redis connection
    async checkRedis() {
        if (!this.redisClient) {
            return { status: 'up' }; // Service doesn't use Redis
        }
        const start = Date.now();
        try {
            await this.redisClient.ping();
            const latency = Date.now() - start;
            return { status: 'up', latency };
        }
        catch (error) {
            return {
                status: 'down',
                error: error instanceof Error ? error.message : 'Redis connection failed'
            };
        }
    }
    // Check database connection
    async checkDatabase() {
        if (!this.prismaClient) {
            return { status: 'up' }; // Service doesn't use database
        }
        const start = Date.now();
        try {
            await this.prismaClient.$queryRaw `SELECT 1`;
            const latency = Date.now() - start;
            return { status: 'up', latency };
        }
        catch (error) {
            return {
                status: 'down',
                error: error instanceof Error ? error.message : 'Database connection failed'
            };
        }
    }
    // Check RabbitMQ connection
    async checkRabbitMQ() {
        if (!this.rabbitmqUrl) {
            return { status: 'up' }; // Service doesn't use RabbitMQ
        }
        const start = Date.now();
        try {
            const connection = await amqp.connect(this.rabbitmqUrl);
            await connection.close();
            const latency = Date.now() - start;
            return { status: 'up', latency };
        }
        catch (error) {
            return {
                status: 'down',
                error: error instanceof Error ? error.message : 'RabbitMQ connection failed'
            };
        }
    }
    // Get system metrics
    getSystemMetrics() {
        return {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage ? process.cpuUsage().user / 1000000 : undefined
        };
    }
    // Main health check handler
    healthHandler = async (req, res) => {
        const [redisStatus, dbStatus, rabbitStatus] = await Promise.all([
            this.checkRedis(),
            this.checkDatabase(),
            this.checkRabbitMQ()
        ]);
        const dependencies = {};
        // Only include dependencies that are actually used
        if (this.redisClient)
            dependencies.redis = redisStatus;
        if (this.prismaClient)
            dependencies.database = dbStatus;
        if (this.rabbitmqUrl)
            dependencies.rabbitmq = rabbitStatus;
        // Determine overall status
        const allUp = Object.values(dependencies).every(d => d.status === 'up');
        const anyDown = Object.values(dependencies).some(d => d.status === 'down');
        let overallStatus = 'healthy';
        if (anyDown) {
            overallStatus = 'unhealthy';
        }
        else if (!allUp) {
            overallStatus = 'degraded';
        }
        const healthStatus = {
            service: this.serviceName,
            status: overallStatus,
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version,
            dependencies,
            metrics: this.getSystemMetrics()
        };
        // Return 200 if healthy, 503 if unhealthy
        const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
        res.status(statusCode).json(healthStatus);
    };
    // Simple liveness probe (just checks if process is alive)
    livenessHandler = (req, res) => {
        res.status(200).json({
            status: 'alive',
            timestamp: new Date().toISOString()
        });
    };
    // Simple readiness probe (checks if service is ready to accept traffic)
    readinessHandler = async (req, res) => {
        try {
            const checks = [];
            if (this.redisClient) {
                checks.push(this.redisClient.ping());
            }
            if (this.prismaClient) {
                checks.push(this.prismaClient.$queryRaw `SELECT 1`);
            }
            if (this.rabbitmqUrl) {
                const connection = await amqp.connect(this.rabbitmqUrl);
                checks.push(connection.close());
            }
            await Promise.all(checks);
            res.status(200).json({ status: 'ready' });
        }
        catch (error) {
            res.status(503).json({
                status: 'not ready',
                error: error instanceof Error ? error.message : 'Readiness check failed'
            });
        }
    };
}
