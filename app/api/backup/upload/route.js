import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path, { join } from 'path';
import { existsSync } from 'fs';
import { getUserFromRequest } from '@/lib/api-auth';

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'superadmin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = path.basename(file.name);

        // Validation: Ensure it's a zip file
        if (!filename || !filename.toLowerCase().endsWith('.zip')) {
            return NextResponse.json({ error: 'Only .zip files are allowed' }, { status: 400 });
        }

        const backupDir = join(process.cwd(), 'backups');

        if (!existsSync(backupDir)) {
            await mkdir(backupDir, { recursive: true });
        }

        const filePath = join(backupDir, filename);
        await writeFile(filePath, buffer);

        return NextResponse.json({ success: true, filename });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Failed to upload backup' }, { status: 500 });
    }
}
