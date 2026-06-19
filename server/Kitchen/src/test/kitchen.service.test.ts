import { KitchenService } from "../services/kitchen.service.js";
import prisma from "../utils/prisma.js";
import { mq } from "../utils/mq.js";
import { redis } from "../utils/redis.js";

jest.mock("../utils/prisma.js", () => ({
    __esModule: true,
    default: {
        job: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
    },
}));

jest.mock("../utils/mq.js", () => ({
    mq: {
        publish: jest.fn(),
    },
}));

jest.mock("../utils/redis.js", () => ({
    redis: {
        get: jest.fn(),
        set: jest.fn(),
    },
}));

describe("KitchenService", () => {
    const jobId = "job-1";
    const orderId = "order-1";
    const userId = "user-1";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    /* =====================================
       getJobById
       ===================================== */

    it("should fetch job by id", async () => {
        const fakeJob = { id: jobId, orderId, status: "ACCEPTED" };

        (prisma.job.findUnique as jest.Mock).mockResolvedValue(fakeJob);

        const result = await KitchenService.getJobById(jobId);

        expect(prisma.job.findUnique).toHaveBeenCalledWith({
            where: { id: jobId },
        });

        expect(result).toEqual(fakeJob);
    });

    /* =====================================
       createJob
       ===================================== */

    it("should create job, publish event and cache it", async () => {
        const fakeJob = { id: jobId, orderId, status: "ACCEPTED" };

        (prisma.job.create as jest.Mock).mockResolvedValue(fakeJob);

        const result = await KitchenService.createJob(userId, orderId);

        expect(prisma.job.create).toHaveBeenCalledWith({
            data: { orderId, status: "ACCEPTED" },
        });

        expect(mq.publish).toHaveBeenCalledWith(
            "kitchen.job.accepted",
            { orderId, userId }
        );

        expect(redis.set).toHaveBeenCalledWith(
            `job:${jobId}`,
            JSON.stringify(fakeJob)
        );

        expect(result).toEqual(fakeJob);
    });

    /* =====================================
       rejectJob
       ===================================== */

    it("should reject job and publish event", async () => {
        const fakeJob = { id: jobId, orderId, status: "REJECTED" };

        (prisma.job.update as jest.Mock).mockResolvedValue(fakeJob);

        const result = await KitchenService.rejectJob(jobId);

        expect(prisma.job.update).toHaveBeenCalledWith({
            where: { id: jobId },
            data: { status: "REJECTED" },
        });

        expect(redis.set).toHaveBeenCalledWith(
            `job:${jobId}`,
            JSON.stringify(fakeJob)
        );

        expect(mq.publish).toHaveBeenCalledWith(
            "kitchen.job.rejected",
            { orderId }
        );

        expect(result).toEqual(fakeJob);
    });

    /* =====================================
       startJob
       ===================================== */

    it("should move job to IN_PROGRESS from cache", async () => {
        const cachedJob = { id: jobId, orderId, status: "ACCEPTED" };

        (redis.get as jest.Mock).mockResolvedValue(
            JSON.stringify(cachedJob)
        );

        const result = await KitchenService.startJob(jobId);

        expect(redis.get).toHaveBeenCalledWith(`job:${jobId}`);

        expect(redis.set).toHaveBeenCalledWith(
            `job:${jobId}`,
            JSON.stringify({
                ...cachedJob,
                status: "IN_PROGRESS",
            })
        );

        expect(result.status).toBe("IN_PROGRESS");
    });

    it("should throw if job not found in cache", async () => {
        (redis.get as jest.Mock).mockResolvedValue(null);

        await expect(
            KitchenService.startJob(jobId)
        ).rejects.toThrow("Job not found in cache");
    });

    /* =====================================
       markCompleted
       ===================================== */

    it("should mark job completed and publish event", async () => {
        const fakeJob = { id: jobId, orderId, status: "COMPLETED" };

        (prisma.job.update as jest.Mock).mockResolvedValue(fakeJob);

        const result = await KitchenService.markCompleted(jobId);

        expect(prisma.job.update).toHaveBeenCalledWith({
            where: { id: jobId },
            data: { status: "COMPLETED" },
        });

        expect(redis.set).toHaveBeenCalledWith(
            `job:${jobId}`,
            JSON.stringify(fakeJob)
        );

        expect(mq.publish).toHaveBeenCalledWith(
            "kitchen.job.completed",
            { orderId }
        );

        expect(result).toEqual(fakeJob);
    });

    /* =====================================
       markFailed
       ===================================== */

    it("should mark job failed and publish event with reason", async () => {
        const fakeJob = { id: jobId, orderId, status: "FAILED" };

        (prisma.job.update as jest.Mock).mockResolvedValue(fakeJob);

        const result = await KitchenService.markFailed(jobId, "Burnt");

        expect(prisma.job.update).toHaveBeenCalledWith({
            where: { id: jobId },
            data: { status: "FAILED" },
        });

        expect(redis.set).toHaveBeenCalledWith(
            `job:${jobId}`,
            JSON.stringify(fakeJob)
        );

        expect(mq.publish).toHaveBeenCalledWith(
            "kitchen.job.failed",
            {
                orderId,
                reason: "Burnt",
            }
        );

        expect(result).toEqual(fakeJob);
    });

    it("should mark failed with null reason if not provided", async () => {
        const fakeJob = { id: jobId, orderId, status: "FAILED" };

        (prisma.job.update as jest.Mock).mockResolvedValue(fakeJob);

        await KitchenService.markFailed(jobId);

        expect(mq.publish).toHaveBeenCalledWith(
            "kitchen.job.failed",
            {
                orderId,
                reason: null,
            }
        );
    });
});