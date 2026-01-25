import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = file.name;

        // Validation: Ensure it's a zip file
        if (!filename.endsWith('.zip')) {
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
