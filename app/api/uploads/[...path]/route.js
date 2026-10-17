import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request, { params }) {
    const resolvedParams = await params;
    const pathArray = resolvedParams?.path;
    if (!pathArray || pathArray.length === 0) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    try {
        const filePath = path.join(process.cwd(), 'public', 'uploads', ...pathArray);
        
        // Prevent directory traversal attacks
        const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
        const resolvedFilePath = path.resolve(filePath);
        if (!resolvedFilePath.startsWith(uploadsDir + path.sep) && resolvedFilePath !== uploadsDir) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const fileBuffer = await readFile(resolvedFilePath);
        
        // Determine content type
        const ext = path.extname(resolvedFilePath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (ext === '.webp') contentType = 'image/webp';
        else if (ext === '.ico') contentType = 'image/x-icon';

        const headers = {
            'Content-Type': contentType,
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
            'Cache-Control': 'public, max-age=31536000, immutable',
        };
        if (contentType === 'application/octet-stream') {
            headers['Content-Disposition'] = 'attachment';
        }
        
        return new NextResponse(fileBuffer, { headers });
    } catch (error) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
}
