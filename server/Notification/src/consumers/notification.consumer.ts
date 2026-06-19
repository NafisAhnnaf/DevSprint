import { mq } from "../utils/mq.js";
import { redis } from "../utils/redis.js";
import { notificationService } from "../services/notification.service.js";

export const NotificationConsumer = async () => {
    await mq.subscribe('notification.pending.queue', "order.created", async (msg) => {
        console.log("Order Pending", msg);
        notificationService.registerOrder(msg.userId, msg.orderId);
        notificationService.pushOrderStatus(msg.userId, msg.orderId, 'PENDING');
    });
    await mq.subscribe('notification.stock_verified.queue', "kitchen.job.accepted", async (msg) => {
        console.log("Stock Verified", msg);
        notificationService.registerOrder(msg.userId, msg.orderId);
        notificationService.pushOrderStatus(msg.userId, msg.orderId, 'STOCK VERIFIED');
    });
    await mq.subscribe('notification.in_kitchen.queue', "order.in_kitchen", async (msg) => {
        console.log("Order in Kitchen", msg);
        notificationService.registerOrder(msg.userId, msg.orderId);
        notificationService.pushOrderStatus(msg.userId, msg.orderId, 'IN KITCHEN');
    });
    await mq.subscribe('notification.ready.queue', "order.completed", async (msg) => {
        console.log("Order Ready", msg);
        notificationService.registerOrder(msg.userId, msg.orderId);
        notificationService.pushOrderStatus(msg.userId, msg.orderId, 'READY');
    });
    await mq.subscribe("inventory.order.cancelled", "order.cancelled", async (msg) => {
        console.log("Order Cancelled", msg);
        if (!msg) return;
        const { orderId, userId } = msg;
        notificationService.removeOrder(msg.orderId);
        notificationService.pushOrderStatus(msg.userId, msg.orderId, 'CANCELLED')
    })
}