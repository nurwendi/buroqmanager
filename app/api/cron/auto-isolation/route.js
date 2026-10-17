import { NextResponse } from 'next/server';
import { checkAndDropUsers } from '@/lib/auto-drop';
import { getUserFromRequest } from '@/lib/api-auth';

// Force dynamic since this relies on Date and external logic
export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('key') || request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '');
        const hasValidSecret = Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
        const user = hasValidSecret ? null : await getUserFromRequest(request);

        if (!hasValidSecret && (!user || (user.role !== 'superadmin' && user.role !== 'admin'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const manual = searchParams.get('manual') === 'true';
        const requestedUserId = searchParams.get('userId'); // Optional specific admin ID
        const userId = user && user.role === 'admin' ? user.id : requestedUserId;
        const forceDate = searchParams.get('forceDate'); // Optional: 1-31 to simulate a specific date

        const targetDate = forceDate ? parseInt(forceDate) : null;

        const result = await checkAndDropUsers({
            manual,
            specificUserId: userId,
            targetDate
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('Auto-Isolation Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
