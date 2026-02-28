import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';

export async function POST(request) {
    try {
        const currentUser = await getUserFromRequest(request);

        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { language } = await request.json();

        if (!language || !['id', 'en', 'auto'].includes(language)) {
            return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
        }

        if (currentUser.role === 'customer') {
            await db.customer.update({
                where: { id: currentUser.id },
                data: { language: language }
            });
        } else {
            await db.user.update({
                where: { id: currentUser.id },
                data: { language: language }
            });
        }

        return NextResponse.json({ success: true, language });
    } catch (error) {
        console.error('Error updating language:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
