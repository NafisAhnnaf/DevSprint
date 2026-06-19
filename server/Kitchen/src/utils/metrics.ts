import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

export const orderCounter = new client.Counter({
  name: 'orders_total',
  help: 'Total number of orders processed',
  labelNames: ['status', 'service']
});

export const errorCounter = new client.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'service']
});

export const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

export const rabbitmqMessageCount = new client.Counter({
  name: 'rabbitmq_messages_total',
  help: 'Total number of RabbitMQ messages processed',
  labelNames: ['queue', 'action']
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);
register.registerMetric(orderCounter);
register.registerMetric(errorCounter);
register.registerMetric(databaseQueryDuration);
register.registerMetric(rabbitmqMessageCount);

// Metrics endpoint handler
export const metricsHandler = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
};

// Middleware to track request duration
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Track active connections
  activeConnections.inc();
  
  // When response finishes, record metrics
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestDuration.labels(req.method, route, res.statusCode.toString()).observe(duration);
    httpRequestTotal.labels(req.method, route, res.statusCode.toString()).inc();
    
    // Track errors (5xx status codes)
    if (res.statusCode >= 500) {
      errorCounter.labels('http_5xx', process.env.SERVICE_NAME || 'unknown').inc();
    }
    
    activeConnections.dec();
  });
  
  next();
};
