import { mq } from "../utils/mq.js";
import { redis } from "../utils/redis.js";
import { OrderService } from "../services/order.service.js";


export const InventoryConsumer = async () => {
    await mq.subscribe("kitchen.job.accepted.queue", "kitchen.job.accepted", async (msg) => {
        if (!msg) return;

        const { orderId } = msg;
        console.log("Job accepted for order: ", orderId);

        await OrderService.markInKitchen(orderId);
    })

    await mq.subscribe("kitchen.job.rejected.queue", "kitchen.job.rejected", async (msg) => {
        if (!msg) return;

        const { orderId } = msg;
        console.log("Job rejected for order: ", orderId);

        await OrderService.markFailed(orderId);
    })

    await mq.subscribe("kitchen.job.completed.queue", "kitchen.job.completed", async (msg) => {
        if (!msg) return;

        const { orderId } = msg;
        console.log("Job completed for order:", orderId);

        await OrderService.markCompleted(orderId)
    });

    await mq.subscribe("kitchen.job.failed.queue", "kitchen.job.failed", async (msg) => {
        if (!msg) return;

        const { orderId, reason } = msg;
        console.log("Job failed for order:", orderId, "Reason:", reason);

        await OrderService.markFailed(orderId);
    });
}