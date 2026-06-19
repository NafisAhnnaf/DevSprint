import { createProxyMiddleware } from "http-proxy-middleware"
import { Request } from "express";
import http from 'http';

const proxyAgent = new http.Agent({ keepAlive: true, maxSockets: 500 });

export const identityProxy = createProxyMiddleware({
    target: process.env.IDENTITY_SERVICE_URL || "http://dev-sprint-identity:4002",
    changeOrigin: true,
    agent: proxyAgent,
    timeout: 30000,
    proxyTimeout: 30000,
    pathRewrite: {
        "^/api/identity": ""
    },
    on: {
        error: (err, req, res: any) => {
            console.error("Identity Proxy Error:", err.message, "URL:", req.url);
            res.status(502).json({ message: "Identity Service Proxy Error", error: err.message });
        }
    }
})

export const inventoryOrderProxy = createProxyMiddleware({
    target: process.env.INVENTORY_SERVICE_URL || "http://dev-sprint-inventory:4003",
    changeOrigin: true,
    agent: proxyAgent,
    timeout: 30000,
    proxyTimeout: 30000,
    pathRewrite: function (path, req: Request) {
        const fullPath = req.originalUrl;
        return fullPath.replace('/api/inventory/order', '/order');
    },
    on: {
        error: (err, req, res: any) => {
            console.error("Proxy Error:", err.message, "URL:", req.url);
            res.status(502).json({ message: "Proxy Error", error: err.message });
        },
        proxyReq: (proxyReq, req) => {
            if (req.headers.user_id) {
                proxyReq.setHeader("user_id", req.headers.user_id);
            }
        },
    }

})

export const inventoryStockProxy = createProxyMiddleware({
    target: process.env.INVENTORY_SERVICE_URL || "http://dev-sprint-inventory:4003",
    changeOrigin: true,
    agent: proxyAgent,
    timeout: 30000,
    proxyTimeout: 30000,
    pathRewrite: function (path, req: Request) {
        const fullPath = req.originalUrl;
        return fullPath.replace('/api/inventory/stock', '/stock');
    },
    on: {
        error: (err, req, res: any) => {
            console.error("Proxy Error:", err.message, "URL:", req.url);
            res.status(502).json({ message: "Proxy Error", error: err.message });
        },
        proxyReq: (proxyReq, req) => {
            if (req.headers.user_id) {
                proxyReq.setHeader("user_id", req.headers.user_id);
            }
            if (req.headers.admin_id) {
                proxyReq.setHeader("admin_id", req.headers.admin_id);
            }
        },
    }

})

export const inventoryOthersProxy = createProxyMiddleware({
    target: process.env.INVENTORY_SERVICE_URL || "http://dev-sprint-inventory:4003",
    changeOrigin: true,
    agent: proxyAgent,
    timeout: 30000,
    proxyTimeout: 30000,
    pathRewrite: function (path, req: Request) {
        const fullPath = req.originalUrl;
        return fullPath.replace('/api/inventory', '');
    },
    on: {
        error: (err, req, res: any) => {
            console.error("Proxy Error:", err.message, "URL:", req.url);
            res.status(502).json({ message: "Proxy Error", error: err.message });
        },
        proxyReq: (proxyReq, req) => {
            if (req.headers.user_id) {
                proxyReq.setHeader("user_id", req.headers.user_id);
            }
            if (req.headers.admin_id) {
                proxyReq.setHeader("admin_id", req.headers.admin_id);
            }
        },
    }

})


export const kitchenProxy = createProxyMiddleware({
    target: process.env.KITCHEN_SERVICE_URL || "http://dev-sprint-kitchen:4004",
    changeOrigin: true,
    agent: proxyAgent,
    timeout: 30000,
    proxyTimeout: 30000,
    pathRewrite: function (path, req: Request) {
        const fullPath = req.originalUrl;
        return fullPath.replace('/api/kitchen', '');
    },
    on: {
        error: (err, req, res: any) => {
            console.error("Proxy Error:", err.message, "URL:", req.url);
            res.status(502).json({ message: "Proxy Error", error: err.message });
        },
        proxyReq: (proxyReq, req) => {
            if (req.headers.user_id) {
                proxyReq.setHeader("user_id", req.headers.user_id);
            }
        },
    }

})

export const notificationProxy = createProxyMiddleware({
    target: process.env.NOTIFICATION_SERVICE_URL || "http://dev-sprint-notification:4005",
    changeOrigin: true,
    agent: proxyAgent,
    timeout: 0, // Disable timeout for long-lived SSE connections
    proxyTimeout: 0,
    pathRewrite: {
        "^/api/notification": ""
    },
    on: {
        error: (err, req, res: any) => {
            console.error("Proxy Error:", err.message, "URL:", req.url);
            res.status(502).json({ message: "Proxy Error", error: err.message });
        },
        proxyReq: (proxyReq, req) => {
            if (req.headers.user_id) {
                proxyReq.setHeader("user_id", req.headers.user_id);
            }
        },
    }

})