import { NextResponse } from 'next/server';
import { createBackup, listBackups } from '@/lib/backup';
import { getUserFromRequest } from '@/lib/api-auth';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'superadmin') {
            return NextResponse.json({ error: 'Forbidden: Only Superadmin can manage full system backups' }, { status: 403 });
        }

        const backups = await listBackups();
        return NextResponse.json(backups);
    } catch (error) {
        console.error('Failed to list backups:', error);
        return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'superadmin') {
            return NextResponse.json({ error: 'Forbidden: Only Superadmin can manage full system backups' }, { status: 403 });
        }

        const result = await createBackup();
        return NextResponse.json({
            success: true,
            backup: result
        });
    } catch (error) {
        console.error('Failed to create backup:', error);
        return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
    }
}
