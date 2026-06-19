import prisma from "../utils/prisma.js";
import type { Request, Response } from "express"


const getAllAdmins = async (req: Request, res: Response) => {
    try {
        const admins = await prisma.admin.findMany({
            select: {
                id: true,
                user_id: true,
                user: {
                    select: {
                        name: true,
                        avatar: true,
                        email: true,
                        birth_date: true,
                    }
                },
            }
        });
        if (admins.length) {
            res.status(200).json({ payload: { admins: admins } });
        }
        else {
            throw new Error("No admin found")
        }
    } catch (error: any) {
        console.error(error);
        res.status(500).json(error.message)
    }
}

const addAdmin = async (req: Request, res: Response) => {
    const { userId } = req.params;
    console.log(userId);
    try {
        if (userId && typeof userId === 'string') {
            const current_admin_id = req.headers.admin_id;
            const approvedById = Array.isArray(current_admin_id) ? current_admin_id[0] : current_admin_id;
            const response = await prisma.admin.create({
                data: { user_id: userId }
            })
            console.log(response);
            res.status(201).json({ message: "User added as Admin" });
        }
        else {
            throw new Error("Invalid ID or ID not found");
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message })
    }
}
const deleteAdmin = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(id);
    try {
        if (id && typeof id === 'string') {
            //Delete with admin id not user id.
            const response = await prisma.admin.delete({
                where: { id: id }
            })
            res.status(200).json({ message: "Admin removed" });
        }
        else {
            throw new Error("Invalid ID or ID not found");
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message })
    }
}


const getAdminAccess = async (req: Request, res: Response) => {
    const adminId = req.headers.admin_id;
    try {
        if (adminId && typeof adminId === 'string') {
            res.status(200).json({ message: "Admin found" });
        }
        else {
            throw new Error("Admin ID not found");
        }
    } catch (error) {
        console.error(error.message);
        res.status(403).json({ message: error.message })
    }
}
const getAdminByUserId = async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        if (userId && typeof userId === 'string') {
            const admin = await prisma.admin.findUnique({
                where: { user_id: userId },
                select: {
                    id: true,
                    user_id: true
                }
            })
            if (admin) res.status(200).json({ message: "Admin found" });
            else throw new Error("Admin not found by User ID");
        }
        else {
            throw new Error("user ID not found");
        }
    } catch (error) {
        console.error(error.message);
        res.status(403).json({ message: error.message })
    }
}

export { addAdmin, deleteAdmin, getAllAdmins, getAdminAccess, getAdminByUserId }