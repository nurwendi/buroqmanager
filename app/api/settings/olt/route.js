import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return unauthorizedResponse();

        const olts = await db.oltConfig.findMany({
            where: { ownerId: user.id },
            orderBy: { createdAt: 'asc' }
        });

        // Mask passwords
        const safeOlts = olts.map(olt => ({
            ...olt,
            password: olt.password ? '********' : ''
        }));

        return NextResponse.json(safeOlts);
    } catch (error) {
        console.error("Get OLT Settings Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return unauthorizedResponse();

        const body = await req.json();
        const { name, host, port, username, password } = body;

        if (!host || !username || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newOlt = await db.oltConfig.create({
            data: {
                ownerId: user.id,
                name: name || host,
                host,
                port: parseInt(port || 23),
                username,
                password
            }
        });

        return NextResponse.json(newOlt);
    } catch (error) {
        console.error("Create OLT Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
