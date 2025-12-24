import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
    return new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy",
            },
        },
    });
};

const globalForPrisma = global;

const db = globalForPrisma.prisma || prismaClientSingleton();

export default db;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
