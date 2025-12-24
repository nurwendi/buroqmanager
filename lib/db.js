import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
    return new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
};

const globalForPrisma = global;

const db = (process.env.BUILD_MODE === 'mobile')
    ? new Proxy({}, {
        get: (target, prop) => {
            // Return a mock function that returns a promise resolving to null
            // This prevents crashes if db.someTable.findMany() is called during build
            return new Proxy({}, {
                get: (t, p) => {
                    return async () => null;
                }
            });
        }
    })
    : (globalForPrisma.prisma || prismaClientSingleton());

export default db;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
