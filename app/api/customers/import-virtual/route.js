import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';
import { getMikrotikClient } from '@/lib/mikrotik';
import { generateCustomerId } from '@/lib/customer-utils';

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const ownerId = user.role === 'admin' ? user.id : user.ownerId || user.id;

        // 1. Get all from DB
        const dbCustomers = await db.customer.findMany({
            where: { ownerId }
        });
        const existingUsernames = new Set(dbCustomers.map(c => c.username));

        // 2. Get all from Mikrotik
        const client = await getMikrotikClient();
        const mikrotikUsers = await client.write('/ppp/secret/print');

        if (!Array.isArray(mikrotikUsers)) {
            return NextResponse.json({ error: 'Failed to fetch Mikrotik users' }, { status: 500 });
        }

        // 3. Find missing (virtual)
        const virtuals = mikrotikUsers.filter(u => !existingUsernames.has(u.name));
        
        let importedCount = 0;
        let errors = 0;

        // 4. Import them
        for (const u of virtuals) {
            try {
                const newCustomerId = await generateCustomerId(ownerId);
                await db.customer.create({
                    data: {
                        username: u.name,
                        customerId: newCustomerId,
                        name: u.name, // Fallback name
                        address: '-',
                        phone: '-',
                        ownerId: ownerId,
                        password: u.password || '',
                        comment: u.comment || ''
                    }
                });
                importedCount++;
            } catch (err) {
                console.error(`Failed to import virtual user ${u.name}:`, err);
                errors++;
            }
        }

        return NextResponse.json({ 
            success: true, 
            importedCount,
            errors,
            message: `Berhasil mengimport ${importedCount} pelanggan virtual.`
        });

    } catch (error) {
        console.error('[Import Virtual] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
