import { NextResponse } from 'next/server';
import { restoreBackup, deleteBackup, getBackupPath } from '@/lib/backup';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { getUserFromRequest } from '@/lib/api-auth';

export async function GET(request, { params }) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'superadmin' && user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { filename } = await params;
        const safeFilename = path.basename(filename);
        const backupPath = getBackupPath(safeFilename);

        // Check if file exists
        await stat(backupPath);

        // Stream the file
        const fileStream = createReadStream(backupPath);

        return new NextResponse(fileStream, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${safeFilename}"`
            }
        });
    } catch (error) {
        console.error('Failed to download backup:', error);
        return NextResponse.json({ error: 'Failed to download backup' }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'superadmin' && user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { filename } = await params;
        const safeFilename = path.basename(filename);
        await restoreBackup(safeFilename);

        return NextResponse.json({
            success: true,
            message: 'Backup restored successfully'
        });
    } catch (error) {
        console.error('Failed to restore backup:', error);
        return NextResponse.json({ error: 'Failed to restore backup' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'superadmin' && user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { filename } = await params;
        const safeFilename = path.basename(filename);
        await deleteBackup(safeFilename);

        return NextResponse.json({
            success: true,
            message: 'Backup deleted successfully'
        });
    } catch (error) {
        console.error('Failed to delete backup:', error);
        return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 });
    }
}
