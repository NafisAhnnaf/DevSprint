// middlewares/chaos.middleware.ts
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

let isKilled = false;
let loadTestInterval: NodeJS.Timeout | null = null;
let loadTestActive = false;

export const chaosMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/chaos/kill' && req.method === 'POST') {
        return next();
    }

    if (isKilled) {
        console.log(`Request blocked - service is killed: ${req.method} ${req.path}`);
        return res.status(503).json({
            message: "Service temporarily unavailable",
            status: "down"
        });
    }
    next();
};

export const chaosToggleHandler = async (req: Request, res: Response) => {
    const serviceName = req.body?.service;
    console.log(`Received chaos kill request for service: ${serviceName}`);

    if (!serviceName || serviceName === "Gateway Service") {
        isKilled = !isKilled;
        const status = isKilled ? "killed" : "restored";
        console.log(`Gateway Chaos mode: ${status}`);
        return res.status(200).json({
            message: `Gateway Service ${status} successfully`,
            status: isKilled ? "down" : "up"
        });
    }

    // Map service name to internal service URL
    let serviceUrl = "";
    switch (serviceName) {
        case "Identity Provider":
            serviceUrl = process.env.IDENTITY_SERVICE_URL || "http://dev-sprint-identity:4002";
            break;
        case "Inventory Service":
            serviceUrl = process.env.INVENTORY_SERVICE_URL || "http://dev-sprint-inventory:4003";
            break;
        case "Kitchen Service":
            serviceUrl = process.env.KITCHEN_SERVICE_URL || "http://dev-sprint-kitchen:4004";
            break;
        case "Notification Hub":
            serviceUrl = process.env.NOTIFICATION_SERVICE_URL || "http://dev-sprint-notification:4005";
            break;
        default:
            return res.status(400).json({ message: `Unknown service: ${serviceName}` });
    }

    try {
        console.log(`Proxying chaos kill to: ${serviceUrl}/chaos/kill`);
        const response = await axios.post(`${serviceUrl}/chaos/kill`);
        return res.status(200).json(response.data);
    } catch (err: any) {
        console.error(`Failed to toggle chaos on service ${serviceName}:`, err.message);
        return res.status(500).json({ message: `Failed to toggle chaos on service ${serviceName}`, error: err.message });
    }
};

export const chaosLoadTestHandler = (req: Request, res: Response) => {
    const { action } = req.body;
    console.log(`Received load test action: ${action}`);

    if (action === "start") {
        if (loadTestActive) {
            return res.status(200).json({ message: "Load test already running", active: true });
        }

        loadTestActive = true;
        console.log("=== Chaos Load Test Triggered via UI ===");

        // Spawn background interval that generates traffic
        loadTestInterval = setInterval(async () => {
            try {
                const identityUrl = process.env.IDENTITY_SERVICE_URL || "http://dev-sprint-identity:4002";
                const inventoryUrl = process.env.INVENTORY_SERVICE_URL || "http://dev-sprint-inventory:4003";

                // Fire concurrent requests to generate metrics
                await Promise.allSettled([
                    axios.get(`${identityUrl}/`),
                    axios.get(`${inventoryUrl}/stock`),
                ]);
            } catch (err) {
                // Ignore background errors
            }
        }, 1500);

        return res.status(200).json({ message: "Load test started successfully", active: true });
    } else if (action === "stop") {
        if (loadTestInterval) {
            clearInterval(loadTestInterval);
            loadTestInterval = null;
        }
        loadTestActive = false;
        console.log("=== Chaos Load Test Stopped via UI ===");
        return res.status(200).json({ message: "Load test stopped successfully", active: false });
    } else {
        return res.status(400).json({ message: "Invalid action. Use 'start' or 'stop'." });
    }
};

export const getChaosState = () => isKilled;