import { PrismaClient } from "../generated/prisma/client.js"
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    connectionLimit: 100
});
const prisma = new PrismaClient({ adapter: pool });

export default prisma;