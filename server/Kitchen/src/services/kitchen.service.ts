// services/kitchen.service.ts
import prisma from "../utils/prisma.js";
import { mq } from "../utils/mq.js";
import { redis } from "../utils/redis.js";

export class KitchenService {
    static async getJobById(id: string) {
        return prisma.job.findUnique({ where: { id } });
    }

    static async createJob(userId: string, orderId: string) {
        const job = await prisma.job.create({
            data: { orderId, status: "ACCEPTED" },
        });
        await mq.publish("kitchen.job.accepted", { orderId: job.orderId, userId: userId });
        redis.set(`job:${job.id}`, JSON.stringify(job));
        return job;
    }
    static async getJobByOrderId(orderId: string) {
        const job = await prisma.job.findUnique({
            where: { orderId: orderId }
        })
        return job
    };
    static async rejectJob(jobId: string) {
        const job = await prisma.job.update({
            where: { id: jobId },
            data: { status: "REJECTED" },
        });
        redis.set(`job:${job.id}`, JSON.stringify(job));
        await mq.publish("kitchen.job.rejected", { orderId: job.orderId });
        return job;
    }

    static async startJob(jobId: string) {
        const jobString = await redis.get(`job:${jobId}`) as string;
        if (!jobString) throw new Error("Job not found in cache");
        const job = JSON.parse(jobString);
        job.status = "IN_PROGRESS";
        await redis.set(`job:${jobId}`, JSON.stringify(job));
        return job;
    }

    static async markCompleted(jobId: string) {
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

    static async markFailed(jobId: string, reason?: string) {
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