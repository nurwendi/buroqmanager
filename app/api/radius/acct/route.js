
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'online' or 'all'

        let where = {};
        let take = 100;

        if (type === 'online') {
            where = {
                acctstoptime: null
            };
        }

        // Determine ordering based on context
        const orderBy = type === 'online'
            ? { acctstarttime: 'desc' } // Newest sessions first
            : { radacctid: 'desc' };  // Newest logs first

        const sessions = await db.radAcct.findMany({
            where,
            take,
            orderBy
        });

        // Serialization for BigInt
        const responseData = sessions.map(s => ({
            ...s,
            radacctid: s.radacctid.toString(),
            acctinputoctets: s.acctinputoctets ? s.acctinputoctets.toString() : '0',
            acctoutputoctets: s.acctoutputoctets ? s.acctoutputoctets.toString() : '0',
        }));

        return NextResponse.json(responseData);
    } catch (error) {
        console.error("Error fetching Radius Accounting:", error);
        return NextResponse.json({ error: 'Failed to fetch accounting data' }, { status: 500 });
    }
}
