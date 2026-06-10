import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request, { params }) {
    const pathArray = params.path;
    if (!pathArray || pathArray.length === 0) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    try {
        const filePath = path.join(process.cwd(), 'public', 'uploads', ...pathArray);
        
        // Prevent directory traversal attacks
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!filePath.startsWith(uploadsDir)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const fileBuffer = await readFile(filePath);
        
        // Determine content type
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (ext === '.svg') contentType = 'image/svg+xml';
        else if (ext === '.webp') contentType = 'image/webp';
        
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            }
        });
    } catch (error) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
}
