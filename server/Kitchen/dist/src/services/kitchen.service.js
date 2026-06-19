// services/kitchen.service.ts
import prisma from "../utils/prisma.js";
import { mq } from "../utils/mq.js";
import { redis } from "../utils/redis.js";
export class KitchenService {
    static async getJobById(id) {
        return prisma.job.findUnique({ where: { id } });
    }
    static async createJob(userId, orderId) {
        const job = await prisma.job.create({
            data: { orderId, status: "ACCEPTED" },
        });
        await mq.publish("kitchen.job.accepted", { orderId: job.orderId, userId: userId });
        redis.set(`job:${job.id}`, JSON.stringify(job));
        return job;
    }
    static async getJobByOrderId(orderId) {
        const job = await prisma.job.findUnique({
            where: { orderId: orderId }
        });
        return job;
    }
    ;
    static async rejectJob(jobId) {
        const job = await prisma.job.update({
            where: { id: jobId },
            data: { status: "REJECTED" },
        });
        redis.set(`job:${job.id}`, JSON.stringify(job));
        await mq.publish("kitchen.job.rejected", { orderId: job.orderId });
        return job;
    }
    static async startJob(jobId) {
        const jobString = await redis.get(`job:${jobId}`);
        if (!jobString)
            throw new Error("Job not found in cache");
        const job = JSON.parse(jobString);
        job.status = "IN_PROGRESS";
        await redis.set(`job:${jobId}`, JSON.stringify(job));
        return job;
    }
    static async markCompleted(jobId) {
        console.log("markCompleted START", jobId);
        const job = await prisma.job.update({
            where: { id: jobId },
            data: { status: "COMPLETED" },
        });
        console.log("DB updated");
        await redis.set(`job:${jobId}`, JSON.stringify(job));
        console.log("Redis updated");
        await mq.publish("kitchen.job.completed", { orderId: job.orderId });
        console.log("Event published");
        return job;
    }
    static async markFailed(jobId, reason) {
        const job = await prisma.job.update({
            where: { id: jobId },
            data: { status: "FAILED" },
        });
        await redis.set(`job:${jobId}`, JSON.stringify(job));
        await mq.publish("kitchen.job.failed", {
            orderId: job.orderId,
            reason: reason || null,
        });
        return job;
    }
}
