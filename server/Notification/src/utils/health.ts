import { Request, Response } from 'express';
import { createClient } from 'redis';
import { RabbitMQ } from '../lib/rabbitmq.js';
import amqp from 'amqplib';

interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version?: string;
  dependencies: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
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
  private mqWrapper?: RabbitMQ; // Your RabbitMQ wrapper
  private rabbitUrl: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }



  // Set Redis client if service uses Redis
  setRedisClient(redis: ReturnType<typeof createClient>) {
    this.redisClient = redis;
  }

  setRabbitMQUrl(url: string) {
    this.rabbitUrl = url;
  }
  setMQWrapper(mq: RabbitMQ) {
    this.mqWrapper = mq;
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



  private async checkRabbitMQ(): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }> {
    if (!this.mqWrapper) {
      return { status: 'up' };
    }

    const start = Date.now();
    try {
      // If you have a way to check if wrapper's connection is alive
      if (this.mqWrapper && this.mqWrapper.connection) {
        // Check if channel exists and is working
        const latency = Date.now() - start;
        return { status: 'up', latency };
      } else {
        // Fallback to creating new connection
        const connection = await amqp.connect(this.rabbitUrl);
        await connection.close();
        const latency = Date.now() - start;
        return { status: 'up', latency };
      }
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
    const [redisStatus, rabbitStatus] = await Promise.all([
      this.checkRedis(),
      this.checkRabbitMQ()
    ]);

    const dependencies = {
      redis: redisStatus,
      rabbitmq: rabbitStatus
    };

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
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
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
    // For readiness, we just need basic dependencies
    try {
      if (this.redisClient) {
        await this.redisClient.ping();
      }
      res.status(200).json({ status: 'ready' });
    } catch (error) {
      res.status(503).json({ status: 'not ready', error });
    }
  };
}

