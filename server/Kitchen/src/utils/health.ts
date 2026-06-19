import { Request, Response } from 'express';
import { createClient } from 'redis';
import prisma from './prisma.js' // Adjust import path as needed
import amqp from 'amqplib';

interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version?: string;
  dependencies: {
    [key: string]: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
  };
  metrics?: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu?: number;
  };
}

export class HealthCheck {
  private serviceName: string;
  private redisClient?: ReturnType<typeof createClient>;
  private prismaClient?: typeof prisma;
  private rabbitmqUrl?: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  // Set Redis client if service uses Redis
  setRedisClient(redis: ReturnType<typeof createClient>) {
    this.redisClient = redis;
  }

  // Set Prisma client if service uses database
  setPrismaClient(pris: typeof prisma) {
    this.prismaClient = pris;
  }

  // Set RabbitMQ URL if service uses RabbitMQ
  setRabbitMQUrl(url: string) {
    this.rabbitmqUrl = url;
  }

  // Check Redis connection
  private async checkRedis(): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }> {
    if (!this.redisClient) {
      return { status: 'up' }; // Service doesn't use Redis
    }

    const start = Date.now();
    try {
      await this.redisClient.ping();
      const latency = Date.now() - start;
      return { status: 'up', latency };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Redis connection failed'
      };
    }
  }

  // Check database connection
  private async checkDatabase(): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }> {
    if (!this.prismaClient) {
      return { status: 'up' }; // Service doesn't use database
    }

    const start = Date.now();
    try {
      await this.prismaClient.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      return { status: 'up', latency };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Database connection failed'
      };
    }
  }

  // Check RabbitMQ connection
  private async checkRabbitMQ(): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }> {
    if (!this.rabbitmqUrl) {
      return { status: 'up' }; // Service doesn't use RabbitMQ
    }

    const start = Date.now();
    try {
      const connection = await amqp.connect(this.rabbitmqUrl);
      await connection.close();
      const latency = Date.now() - start;
      return { status: 'up', latency };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'RabbitMQ connection failed'
      };
    }
  }

  // Get system metrics
  private getSystemMetrics() {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage ? process.cpuUsage().user / 1000000 : undefined
    };
  }

  // Main health check handler
  healthHandler = async (req: Request, res: Response) => {
    const [redisStatus, dbStatus, rabbitStatus] = await Promise.all([
      this.checkRedis(),
      this.checkDatabase(),
      this.checkRabbitMQ()
    ]);

    const dependencies: { [key: string]: { status: 'up' | 'down'; latency?: number; error?: string } } = {};

    // Only include dependencies that are actually used
    if (this.redisClient) dependencies.redis = redisStatus;
    if (this.prismaClient) dependencies.database = dbStatus;
    if (this.rabbitmqUrl) dependencies.rabbitmq = rabbitStatus;

    // Determine overall status
    const allUp = Object.values(dependencies).every(d => d.status === 'up');
    const anyDown = Object.values(dependencies).some(d => d.status === 'down');

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (anyDown) {
      overallStatus = 'unhealthy';
    } else if (!allUp) {
      overallStatus = 'degraded';
    }

    const healthStatus: HealthStatus = {
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
  livenessHandler = (req: Request, res: Response) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  };

  // Simple readiness probe (checks if service is ready to accept traffic)
  readinessHandler = async (req: Request, res: Response) => {
    try {
      const checks = [];

      if (this.redisClient) {
        checks.push(this.redisClient.ping());
      }
      if (this.prismaClient) {
        checks.push(this.prismaClient.$queryRaw`SELECT 1`);
      }
      if (this.rabbitmqUrl) {
        const connection = await amqp.connect(this.rabbitmqUrl);
        checks.push(connection.close());
      }

      await Promise.all(checks);
      res.status(200).json({ status: 'ready' });
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        error: error instanceof Error ? error.message : 'Readiness check failed'
      });
    }
  };
}