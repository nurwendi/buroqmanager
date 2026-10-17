import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import { updateUser } from '@/lib/auth';

export async function POST(request) {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
        const ext = path.extname(file.name || '').toLowerCase();
        if (!allowedExts.includes(ext)) {
            return NextResponse.json({ error: "Only PNG, JPG, WEBP, and GIF images are allowed" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.length > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 });
        }

        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
        await mkdir(uploadDir, { recursive: true });

        // Generate filename
        const safeUserId = String(user.id).replace(/[^a-zA-Z0-9_-]/g, '');
        const filename = `${safeUserId}-${Date.now()}${ext}`;
        const filePath = path.join(uploadDir, filename);

        await writeFile(filePath, buffer);
        const avatarUrl = `/api/uploads/avatars/${filename}`;

        // Update user or customer profile with new avatar URL
        if (user.role === 'customer') {
            const db = (await import('@/lib/db')).default;
            await db.customer.update({
                where: { id: user.id },
                data: { avatar: avatarUrl }
            });
        } else {
            await updateUser(user.id, { avatar: avatarUrl });
        }

        return NextResponse.json({ success: true, avatarUrl });
    } catch (error) {
        console.error('Avatar upload error:', error);
        return NextResponse.json({ error: error.message || "Failed to upload avatar" }, { status: 500 });
    }
}
