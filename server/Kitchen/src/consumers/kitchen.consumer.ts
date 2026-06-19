// consumers/kitchen.consumer.ts
import { mq } from "../utils/mq.js";
import { KitchenService } from "../services/kitchen.service.js";


export const KitchenConsumer = async () => {
    console.log("From Kitchen Consumer");
    await mq.subscribe("inventory.order.queue", "order.created", async (msg) => {
        console.log("Trigger from order created", msg);
        if (!msg) return;

        const { orderId, userId } = msg;
        console.log("New order received in Kitchen:", orderId);


        const job = await KitchenService.createJob(userId, orderId);
        const randomTime = Math.random() * 5000 + 2000;// simulate 5-7s prep
        setTimeout(async () => {
            try {
                await KitchenService.markCompleted(job.id);
                console.log("Job completed:", job.id, " in time(sec):", Math.floor(randomTime / 1000));
            } catch (err: any) {
                console.error("ERROR IN markCompleted:", err);

                try {
                    await KitchenService.markFailed(job.id, err?.message || "UNKNOWN_ERROR");
                } catch (failErr) {
                    console.error("ERROR IN markFailed:", failErr);
                }
            }
        }, randomTime);
    });
    await mq.subscribe("inventory.order.cancelled", "order.cancelled", async (msg) => {
        console.log("Trigger from order created", msg);
        if (!msg) return;

        const { orderId, userId } = msg;
        console.log("Order cancel request received in Kitchen:", orderId);
        const job = await KitchenService.getJobByOrderId(orderId);
        try {
            await KitchenService.markFailed(job.id, "CANCELLED");
        } catch (failErr) {
            console.error("ERROR IN markFailed:", failErr);
        }
    })
};