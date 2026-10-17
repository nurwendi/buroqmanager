import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';
import { getMikrotikClient } from '@/lib/mikrotik';
import { generateCustomerIdsBatch } from '@/lib/customer-utils';

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const ownerId = user.role === 'admin' ? user.id : user.ownerId || user.id;

        // 1. Get all existing usernames from DB (select only username)
        const dbCustomers = await db.customer.findMany({
            where: { ownerId },
            select: { username: true }
        });
        const existingUsernames = new Set(dbCustomers.map(c => c.username));

        // 2. Get all from Mikrotik
        const client = await getMikrotikClient();
        const mikrotikUsers = await client.write('/ppp/secret/print');

        if (!Array.isArray(mikrotikUsers)) {
            return NextResponse.json({ error: 'Failed to fetch Mikrotik users' }, { status: 500 });
        }

        // 3. Find missing (virtual)
        const virtuals = mikrotikUsers.filter(u => u.name && !existingUsernames.has(u.name));

        if (virtuals.length === 0) {
            return NextResponse.json({
                success: true,
                importedCount: 0,
                errors: 0,
                message: 'Tidak ada pelanggan virtual baru untuk diimport.'
            });
        }

        // 4. Batch-generate Customer IDs and insert in chunks of 1000
        const batchCustomerIds = await generateCustomerIdsBatch(ownerId, virtuals.length);
        const customersToCreate = virtuals.map((u, idx) => ({
            username: u.name,
            customerId: batchCustomerIds[idx],
            name: u.name,
            address: '-',
            phone: '-',
            ownerId: ownerId,
            password: u.password || '',
            comment: u.comment || ''
        }));

        let importedCount = 0;
        const CHUNK_SIZE = 1000;
        for (let i = 0; i < customersToCreate.length; i += CHUNK_SIZE) {
            const chunk = customersToCreate.slice(i, i + CHUNK_SIZE);
            const res = await db.customer.createMany({
                data: chunk,
                skipDuplicates: true
            });
            importedCount += res.count;
        }

        return NextResponse.json({ 
            success: true, 
            importedCount,
            errors: virtuals.length - importedCount,
            message: `Berhasil mengimport ${importedCount} pelanggan virtual.`
        });

    } catch (error) {
        console.error('[Import Virtual] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
