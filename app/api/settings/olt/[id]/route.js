import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function PUT(request, { params }) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return unauthorizedResponse();

        const { id } = await params;
        const body = await request.json();

        const { name, host, port, username, password } = body;

        // Verify ownership
        const existing = await db.oltConfig.findUnique({
            where: { id }
        });

        if (!existing || existing.ownerId !== user.id) {
            return NextResponse.json({ error: "OLT not found or access denied" }, { status: 404 });
        }

        let passwordToSave = password;
        if (!password || password === '********') {
            passwordToSave = existing.password;
        }

        const updated = await db.oltConfig.update({
            where: { id },
            data: {
                name,
                host,
                port: parseInt(port),
                username,
                password: passwordToSave
            }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Update OLT Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return unauthorizedResponse();

        const { id } = await params;

        // Verify ownership
        const existing = await db.oltConfig.findUnique({
            where: { id }
        });

        if (!existing || existing.ownerId !== user.id) {
            return NextResponse.json({ error: "OLT not found or access denied" }, { status: 404 });
        }

        await db.oltConfig.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete OLT Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
