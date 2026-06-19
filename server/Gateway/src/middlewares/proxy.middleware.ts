import { createProxyMiddleware } from "http-proxy-middleware"
import { Request } from "express";
export const identityProxy = createProxyMiddleware({
    target: process.env.IDENTITY_SERVICE_URL || "http://dev-sprint-identity:4002",
    changeOrigin: true,
    timeout: 5000,
    proxyTimeout: 5000,
    pathRewrite: {
        "^/api/identity": ""
    },
})

export const inventoryOrderProxy = createProxyMiddleware({
    target: process.env.INVENTORY_SERVICE_URL || "http://dev-sprint-inventory:4003",
    changeOrigin: true,
    timeout: 5000,
    proxyTimeout: 5000,
    pathRewrite: function (path, req: Request) {
        const fullPath = req.originalUrl;
        return fullPath.replace('/api/inventory/order', '/order');
    },
    on: {
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
    timeout: 5000,
    proxyTimeout: 5000,
    pathRewrite: function (path, req: Request) {
        const fullPath = req.originalUrl;
        return fullPath.replace('/api/inventory/stock', '/stock');
    },
    on: {
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
    timeout: 5000,
    proxyTimeout: 5000,
    pathRewrite: function (path, req: Request) {
        const fullPath = req.originalUrl;
        return fullPath.replace('/api/inventory', '');
    },
    on: {
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
    timeout: 5000,
    proxyTimeout: 5000,
    pathRewrite: function (path, req: Request) {
        const fullPath = req.originalUrl;
        return fullPath.replace('/api/kitchen', '');
    },
    on: {
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
    timeout: 5000,
    proxyTimeout: 5000,
    pathRewrite: {
        "^/api/notification": ""
    },
    on: {
        proxyReq: (proxyReq, req) => {
            if (req.headers.user_id) {
                proxyReq.setHeader("user_id", req.headers.user_id);
            }
        },
    }

})