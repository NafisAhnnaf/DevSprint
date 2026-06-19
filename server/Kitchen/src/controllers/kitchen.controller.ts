// controllers/kitchen.controller.ts
import { Request, Response } from "express";
import { KitchenService } from "../services/kitchen.service.js";


export const getJob = async (req: Request, res: Response) => {
    const { jobId } = req.params;
    if (!jobId || typeof jobId !== 'string') {
        return res.status(400).json("Invalid JobId")
    }
    try {
        const job = await KitchenService.getJobById(jobId);
        if (!job) return res.status(404).json({ message: "Job not found" });
        res.status(200).json({ payload: job });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
}

export const markJobCompleted = async (req: Request, res: Response) => {
    const { jobId } = req.params;
    if (!jobId || typeof jobId !== 'string') {
        return res.status(400).json("Invalid JobId")
    }
    try {
        const job = await KitchenService.markCompleted(jobId);
        res.status(200).json({ payload: job });
    } catch (err: any) {
        res.status(500).json({ message: err.message });
    }
}
