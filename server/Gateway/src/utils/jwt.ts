import jwt from "jsonwebtoken";
import type { JwtPayload } from 'jsonwebtoken'
const secret = process.env.JWT_SECRET as string;

export const encodeJwt = (id: string): string => {
    if (!id) throw new Error("ID missing");
    if (!secret) throw new Error("JWT secret missing");

    return jwt.sign(
        { sub: id },
        secret,
        { expiresIn: "6h" }
    );
};

export const decodeJwt = (token: string): string => {
    if (!token) throw new Error("Token missing");
    if (!secret) throw new Error("JWT secret missing");

    const payload = jwt.verify(token, secret) as JwtPayload;

    if (!payload.sub) {
        throw new Error("Invalid token payload");
    }

    return payload.sub as string;
};