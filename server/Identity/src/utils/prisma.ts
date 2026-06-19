import { PrismaClient } from "../generated/prisma/client.js"
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: 200,
    min: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
const prisma = new PrismaClient({ adapter: pool });

export default prisma;