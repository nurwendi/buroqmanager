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

        const buffer = Buffer.from(await file.arrayBuffer());

        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
        await mkdir(uploadDir, { recursive: true });

        // Generate filename
        const ext = file.name.split('.').pop();
        const filename = `${user.id}-${Date.now()}.${ext}`;
        const filePath = path.join(uploadDir, filename);

        await writeFile(filePath, buffer);

        // Update user profile with new avatar URL
        const avatarUrl = `/uploads/avatars/${filename}`;
        await updateUser(user.id, { avatar: avatarUrl });

        return NextResponse.json({ success: true, avatarUrl });
    } catch (error) {
        console.error('Avatar upload error:', error);
        return NextResponse.json({ error: error.message || "Failed to upload avatar" }, { status: 500 });
    }
}
