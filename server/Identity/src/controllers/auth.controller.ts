import { Request, Response } from "express";
// import argon from "argon2";
import argon from "argon2";
import prisma from "../utils/prisma.js";
import { encodeJwt } from "../utils/jwt.js";

export const loginUser = async (req: Request, res: Response) => {
    const { studentId, password } = req.body;
    // console.log("Here from login User", req.body);
    try {
        if (studentId && password) {
            const response = await prisma.user.findUnique({
                where: { institution_id: studentId },
                select: {
                    id: true,
                    password: true
                }
            })
            if (!response) return res.status(404).json({ message: "You must register first" });
            if (response?.password) {
                // console.log();
                const hasMatched = await argon.verify(response.password, password);
                if (!hasMatched) return res.status(400).json("Invalid Password");
                else {
                    const token = encodeJwt(response.id);
                    const user = {
                        studentId
                    }
                    return res.status(200).json({ payload: { user, token }, message: "User Logged in" });
                }
            }
        }
        else throw new Error("Invalid credentials");

    } catch (error: any) {
        if (error.code === "P2022") res.status(404).json({ message: "You must register first" });
        console.log(error);
        res.status(500).json({ message: "Something went wrong while logging you in" })
    }
}

export const registerUser = async (req: Request, res: Response) => {
    const { name, studentId, email, password, confirmPassword } = req.body;
    console.log("Here at Register User", req.body);
    try {
        if (!email || password !== confirmPassword || !studentId) {
            return res.status(400).json({ message: "Bad Request: Invalid email or password" });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ message: "User already exists. Try Logging In" });

        const hashedPassword = await argon.hash(password);
        const createdUser = await prisma.user.create({
            data: { name, email, password: hashedPassword, institution_id: studentId }
        });

        return res.status(201).json({
            message: "User registered successfully",
            user: { email }
        });

    } catch (error: any) {

        // Handle Unique key violation for same user register......
        console.error(error);
        return res.status(500).json({ message: "Something went wrong while registering user: " + error.message });
    }
};




export const getStatus = async (req: Request, res: Response) => {
    res.status(200).json({ message: "Identity Service is up and running" });
}   