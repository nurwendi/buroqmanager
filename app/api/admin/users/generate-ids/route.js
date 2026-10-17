import { NextResponse } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import db from '@/lib/db';

export async function POST(request) {
    try {
        const currentUser = await getUserFromRequest(request);
        if (!currentUser) return unauthorizedResponse();

        if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
            return NextResponse.json({ error: 'Forbidden: Hanya Admin atau Superadmin yang dapat men-generate ID Staf.' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const forceAll = body.force === true;

        // 1. Konversi role viewer jika masih ada
        await db.user.updateMany({
            where: {
                role: 'viewer',
                ...(currentUser.role === 'admin' ? { ownerId: currentUser.id } : {})
            },
            data: { role: 'staff' }
        });

        // 2. Pastikan Admin memiliki OwnerID 2 digit
        if (currentUser.role === 'superadmin') {
            const admins = await db.user.findMany({
                where: { role: 'admin' },
                orderBy: { createdAt: 'asc' }
            });
            let maxAdminNum = 1;
            for (const a of admins) {
                const n = parseInt(a.agentNumber, 10);
                if (!isNaN(n) && n >= maxAdminNum) maxAdminNum = n + 1;
            }
            for (const a of admins) {
                if (!a.agentNumber || a.agentNumber.trim() === '') {
                    const newAdminId = String(maxAdminNum++).padStart(2, '0');
                    await db.user.update({ where: { id: a.id }, data: { agentNumber: newAdminId } });
                }
            }
        } else if (currentUser.role === 'admin') {
            const adminRecord = await db.user.findUnique({ where: { id: currentUser.id } });
            if (adminRecord && (!adminRecord.agentNumber || adminRecord.agentNumber.trim() === '')) {
                const admins = await db.user.findMany({ where: { role: 'admin' }, select: { agentNumber: true } });
                let maxAdminNum = 1;
                for (const a of admins) {
                    const n = parseInt(a.agentNumber, 10);
                    if (!isNaN(n) && n >= maxAdminNum) maxAdminNum = n + 1;
                }
                await db.user.update({
                    where: { id: currentUser.id },
                    data: { agentNumber: String(maxAdminNum).padStart(2, '0') }
                });
            }
        }

        // 3. Ambil daftar staf sesuai scope (Admin hanya staf miliknya, Superadmin semua staf)
        const operationalRoles = ['manager', 'editor', 'staff', 'agent', 'technician', 'partner'];
        const whereClause = {
            role: { in: operationalRoles },
            ...(currentUser.role === 'admin' ? { ownerId: currentUser.id } : {})
        };

        const staffUsers = await db.user.findMany({
            where: whereClause,
            orderBy: { createdAt: 'asc' }
        });

        const owners = await db.user.findMany({
            where: { role: { in: ['admin', 'superadmin'] } },
            select: { id: true, agentNumber: true }
        });
        const ownerPrefixMap = new Map(
            owners.map(o => [o.id, (o.agentNumber && o.agentNumber.trim() !== '') ? o.agentNumber.trim() : '01'])
        );

        const staffByOwner = new Map();
        for (const u of staffUsers) {
            const key = u.ownerId || currentUser.id;
            if (!staffByOwner.has(key)) staffByOwner.set(key, []);
            staffByOwner.get(key).push(u);
        }

        let updatedCount = 0;
        for (const [ownerKey, list] of staffByOwner.entries()) {
            const prefix = ownerPrefixMap.get(ownerKey) || '01';
            const validPattern = new RegExp(`^${prefix}\\d{3}$`);

            let maxSeq = 0;
            if (!forceAll) {
                for (const u of list) {
                    const currentId = (u.agentNumber || '').trim();
                    if (validPattern.test(currentId)) {
                        const seq = parseInt(currentId.substring(prefix.length), 10);
                        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
                    }
                }
            }

            for (const u of list) {
                const currentId = (u.agentNumber || '').trim();
                if (validPattern.test(currentId) && !forceAll) continue;

                maxSeq++;
                const newId = `${prefix}${String(maxSeq).padStart(3, '0')}`;
                await db.user.update({
                    where: { id: u.id },
                    data: { agentNumber: newId }
                });
                updatedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            updatedCount,
            message: updatedCount > 0
                ? `Berhasil men-generate ${updatedCount} ID Staf dengan format standar.`
                : 'Semua akun Manajer, Editor, dan Staf sudah memiliki ID standar.'
        });
    } catch (error) {
        console.error('[Generate Staff IDs] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
