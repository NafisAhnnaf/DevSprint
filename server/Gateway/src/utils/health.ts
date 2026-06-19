import { Request, Response } from 'express';
import { createClient } from 'redis';

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
  proxies?: {
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
  private proxyUrls?: {
    identity?: string;
    inventory?: string;
    notification?: string;
  };

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  // Set Redis client if service uses Redis
  setRedisClient(redis: ReturnType<typeof createClient>) {
    this.redisClient = redis;
  }

  // Set proxy URLs to check
  setProxyUrls(urls: { identity?: string; inventory?: string; kitchen: string; notification?: string }) {
    this.proxyUrls = urls;
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

  // Check proxy service health
  private async checkProxy(name: string, url: string): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }> {
    if (!url) {
      return { status: 'up' }; // Skip if URL not configured
    }

    const start = Date.now();
    try {
      // Try to hit the service's health endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

      const response = await fetch(`${url}/health`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      }).catch(async () => {
        // Fallback to service root if /health doesn't exist
        return fetch(url, { signal: controller.signal });
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - start;

      if (response.ok) {
        return { status: 'up', latency };
      } else {
        return { status: 'down', latency, error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error) {
      let errorMessage = 'Connection failed';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Timeout after 3s';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        status: 'down',
        error: errorMessage
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
    const [redisStatus] = await Promise.all([
      this.checkRedis()
    ]);

    const dependencies = {
      redis: redisStatus,
    };

    // Check proxy services if URLs are configured
    let proxyStatuses = {};
    if (this.proxyUrls) {
      const proxyChecks = [];
      const proxyNames = [];

      if (this.proxyUrls.identity) {
        proxyChecks.push(this.checkProxy('identity', this.proxyUrls.identity));
        proxyNames.push('identity');
      }
      if (this.proxyUrls.inventory) {
        proxyChecks.push(this.checkProxy('inventory', this.proxyUrls.inventory));
        proxyNames.push('inventory');
      }
      if (this.proxyUrls.notification) {
        proxyChecks.push(this.checkProxy('notification', this.proxyUrls.notification));
        proxyNames.push('notification');
      }

      const results = await Promise.all(proxyChecks);
      proxyStatuses = results.reduce((acc, result, index) => {
        acc[proxyNames[index]] = result;
        return acc;
      }, {});
    }

    // Determine overall status
    const allDepsUp = Object.values(dependencies).every(d => d.status === 'up');
    const anyDepDown = Object.values(dependencies).some(d => d.status === 'down');

    // Check proxy statuses
    const allProxiesUp = Object.values(proxyStatuses).every((p: any) => p.status === 'up');
    const anyProxyDown = Object.values(proxyStatuses).some((p: any) => p.status === 'down');
    const anyProxyDegraded = Object.values(proxyStatuses).some((p: any) => p.status === 'degraded');

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    if (anyDepDown) {
      overallStatus = 'unhealthy'; // Core dependencies down
    } else if (anyProxyDown) {
      overallStatus = 'degraded'; // Some proxy services down
    } else if (anyProxyDegraded) {
      overallStatus = 'degraded'; // Some proxy services degraded
    } else if (!allProxiesUp) {
      overallStatus = 'degraded';
    }

    const healthStatus: HealthStatus = {
      service: this.serviceName,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      dependencies,
      proxies: proxyStatuses,
      metrics: this.getSystemMetrics()
    };

    // Return 200 if healthy/degraded, 503 if unhealthy
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

  // Readiness probe - checks if gateway can route to at least one service
  readinessHandler = async (req: Request, res: Response) => {
    try {
      // Check Redis
      if (this.redisClient) {
        await this.redisClient.ping();
      }

      // Check if at least one proxy is reachable
      if (this.proxyUrls) {
        const checks = [];
        if (this.proxyUrls.identity) checks.push(this.checkProxy('identity', this.proxyUrls.identity));
        if (this.proxyUrls.inventory) checks.push(this.checkProxy('inventory', this.proxyUrls.inventory));
        if (this.proxyUrls.notification) checks.push(this.checkProxy('notification', this.proxyUrls.notification));

        const results = await Promise.all(checks);
        const anyUp = results.some(r => r.status === 'up');

        if (!anyUp && checks.length > 0) {
          throw new Error('No proxy services reachable');
        }
      }

      res.status(200).json({ status: 'ready' });
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        error: error instanceof Error ? error.message : 'Readiness check failed'
      });
    }
  };
}