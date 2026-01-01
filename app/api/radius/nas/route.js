
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request) {
    try {
        const nasList = await db.nas.findMany({
            orderBy: { id: 'desc' }
        });
        return NextResponse.json(nasList);
    } catch (error) {
        console.error("Error fetching NAS:", error);
        return NextResponse.json({ error: 'Failed to fetch NAS list' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const start = Date.now();
        // Validation: Required fields for FreeRADIUS
        if (!body.nasname || !body.secret) {
            return NextResponse.json({ error: 'nasname (IP) and secret are required' }, { status: 400 });
        }

        const newNas = await db.nas.create({
            data: {
                nasname: body.nasname,
                shortname: body.shortname || null,
                type: body.type || 'other',
                ports: body.ports ? parseInt(body.ports) : null,
                secret: body.secret,
                description: body.description || null,
                community: body.community || null,
                server: body.server || null
            }
        });

        return NextResponse.json(newNas, { status: 201 });
    } catch (error) {
        console.error("Error creating NAS:", error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'NAS IP (nasname) must be unique' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to create NAS' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await db.nas.delete({ where: { id: parseInt(id) } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
