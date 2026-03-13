import { NextResponse } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import { getNotifications, createBlastNotification, sendTargetedNotificationByUsername } from '@/lib/notifications-db';

export async function GET(request) {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;

    const queryParams = { limit };
    if (user.role === 'customer') {
        queryParams.customerId = user.id;
    } else {
        queryParams.userId = user.id;
    }

    const notifications = await getNotifications(queryParams);
    return NextResponse.json(notifications);
}

export async function POST(request) {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    // Only Admin or Superadmin can send blasts/targeted notifications from the dashboard
    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { title, message, type, target, username } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Admin can only blast/send to their own organization
        // Superadmin can blast everything (ownerId null) or specify ownerId
        const ownerId = user.role === 'superadmin' ? (body.ownerId || null) : user.id;

        let notification;

        if (username) {
            // Targeted notification to specific username (common in mobile app)
            notification = await sendTargetedNotificationByUsername({
                username,
                title: title || 'Pengumuman',
                message,
                type: type || 'info',
                senderId: user.id,
                ownerId
            });
        } else {
            // Blast notification
            notification = await createBlastNotification({
                title: title || 'Pengumuman',
                message,
                type: type || 'info',
                senderId: user.id,
                ownerId,
                target: target || 'all'
            });
        }

        return NextResponse.json({ success: true, notification });
    } catch (error) {
        console.error('[API Notifications] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
