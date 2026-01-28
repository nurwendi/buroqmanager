import { NextResponse } from 'next/server';
import { checkAndDropUsers } from '@/lib/auto-drop';

// Force dynamic since this relies on Date and external logic
export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const manual = searchParams.get('manual') === 'true';
        const userId = searchParams.get('userId'); // Optional specific admin ID
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
