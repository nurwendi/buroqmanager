import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/api-auth';
import { getMikrotikClient } from '@/lib/mikrotik';


export async function GET(request, { params }) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { username } = await params;

        // Since username is not unique globally, we use findFirst. 
        // Filter by ownerId for tenant safety if not superadmin
        const customer = await db.customer.findFirst({
            where: {
                username: username,
                ...(user.role !== 'superadmin' ? { ownerId: user.role === 'admin' ? user.id : user.ownerId } : {})
            }
        });

        if (!customer) {
            return NextResponse.json({
                name: '',
                address: '',
                phone: ''
            });
        }

        return NextResponse.json(customer);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || user.role === 'customer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { username } = await params;
        const body = await request.json();
        const { name, address, phone, coordinates, comment, password } = body;

        let storedPassword = undefined;
        if (password) {
            const bcrypt = await import('bcryptjs');
            storedPassword = password.startsWith('$2a$') || password.startsWith('$2b$') ? password : await bcrypt.hash(password, 10);
        }

        // Use updateMany scoped by ownerId for tenant safety
        const updatedCustomer = await db.customer.updateMany({
            where: {
                username: username,
                ...(user.role !== 'superadmin' ? { ownerId: user.role === 'admin' ? user.id : user.ownerId } : {})
            },
            data: {
                name: name || undefined,
                address: address || undefined,
                phone: phone || undefined,
                coordinates: coordinates || undefined,
                comment: comment || undefined,
                password: storedPassword
            }
        });

        // Also update User if name/phone matches?
        await db.user.updateMany({
            where: { username: username },
            data: {
                fullName: name || undefined,
                address: address || undefined,
                phone: phone || undefined
            }
        }).catch(() => { });

        return NextResponse.json({ success: true, count: updatedCustomer.count });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { username } = await params;
        const user = await getUserFromRequest(request);
        if (!user || user.role === 'customer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Resolve context
        const ownerId = user.role === 'admin' ? user.id : user.ownerId;
        
        // --- 1. APPROVAL WORKFLOW CHECK ---
        if (['staff', 'agent', 'technician'].includes(user.role)) {
            // Check if there's already a pending request
            const existing = await db.registration.findFirst({
                where: { targetUsername: username, status: 'pending', type: 'delete' }
            });
            if (existing) {
                return NextResponse.json({ error: 'Permintaan hapus sedang menunggu persetujuan Admin' }, { status: 400 });
            }

            // Create Pending Delete Request
            await db.registration.create({
                data: {
                    type: 'delete',
                    status: 'pending',
                    username: `req_del_${Date.now()}_${username}`,
                    targetUsername: username,
                    agentId: user.id,
                    ownerId: ownerId,
                    name: username // Display name
                }
            });

            // Send Notification to Admin/Owner
            try {
                const { sendNotification } = await import('@/lib/notifications-db');
                await sendNotification({
                    title: 'Permintaan Hapus',
                    message: `Permintaan penghapusan untuk pelanggan ${username} telah diajukan oleh ${user.fullName || user.username} dan memerlukan verifikasi.`,
                    type: 'alert',
                    ownerId: ownerId,
                    recipients: [{ userId: ownerId }]
                });
            } catch (notifErr) {
                console.error('Failed to send delete request notification:', notifErr);
            }

            return NextResponse.json({ 
                success: true, 
                pendingApproval: true, 
                message: "Permintaan hapus telah diajukan untuk disetujui Admin" 
            });
        }

        // --- 2. IMMEDIATE DELETION (Admin/Manager/Superadmin) ---
        
        // A. Mikrotik Cleanup — fire-and-forget with 4s timeout so it never blocks DB deletion
        // If Mikrotik is offline/slow the PPPoE secret becomes orphaned (acceptable trade-off)
        const mikrotikCleanup = (async () => {
            try {
                const { getConfig, getUserConnectionId } = await import('@/lib/config');
                const config = await getConfig();
                const connectionId = getUserConnectionId(user, config);
                if (!connectionId) return;

                const client = await getMikrotikClient(connectionId);
                const secrets = await client.write('/ppp/secret/print', [`?name=${username}`]);
                if (secrets.length > 0) {
                    await client.write('/ppp/secret/remove', [`=.id=${secrets[0]['.id']}`]);
                    console.log(`[Mikrotik] Removed PPPoE secret: ${username}`);
                }
                const actives = await client.write('/ppp/active/print', [`?name=${username}`]);
                for (const active of actives) {
                    await client.write('/ppp/active/remove', [`=.id=${active['.id']}`]);
                }
            } catch (mErr) {
                console.error('[Mikrotik] Cleanup error (non-fatal):', mErr.message);
            }
        })();

        // Race: if Mikrotik takes > 4s we skip it and proceed to DB deletion immediately
        await Promise.race([
            mikrotikCleanup,
            new Promise(resolve => setTimeout(resolve, 4000))
        ]);

        // B. Database Deletion (Transaction)
        // Find the customer to ensure they exist and belong to the tenant
        // Fix: Allow admin to delete if ownerId matches OR if it's null (orphan) to prevent lock-in
        const customer = await db.customer.findFirst({
            where: { 
                username: username,
                ...(user.role !== 'superadmin' ? {
                    OR: [
                        { ownerId: ownerId },
                        { ownerId: null }
                    ]
                } : {})
            }
        });

        if (!customer && user.role !== 'superadmin') {
            return NextResponse.json({ error: 'Pelanggan tidak ditemukan atau Anda tidak memiliki akses' }, { status: 404 });
        }

        // Clean up dependencies and delete
        try {
            await db.$transaction(async (tx) => {
                // 1. Notification cleanup
                await tx.notificationRecipient.deleteMany({
                    where: { customerId: customer?.id }
                });

                const assocUser = await tx.user.findFirst({ where: { username: username, role: 'customer' } });
                if (assocUser) {
                    await tx.notificationRecipient.deleteMany({
                        where: { userId: assocUser.id }
                    });
                }

                // 2. Radius cleanup
                await tx.radCheck.deleteMany({ where: { username } });
                await tx.radReply.deleteMany({ where: { username } });
                await tx.radUserGroup.deleteMany({ where: { username } });

                // 3. User & Customer cleanup
                await tx.user.deleteMany({ where: { username, role: 'customer' } });
                
                // Use specific ID if found for safety, otherwise fallback to username-based delete
                if (customer?.id) {
                    await tx.customer.delete({ where: { id: customer.id } });
                } else {
                    await tx.customer.deleteMany({ 
                        where: { 
                            username, 
                            ownerId: user.role === 'superadmin' ? undefined : ownerId 
                        } 
                    });
                }
            });

            return NextResponse.json({ success: true, message: "Pelanggan berhasil dihapus" });
        } catch (txErr) {
            console.error('Delete Transaction Error:', txErr);
            return NextResponse.json({ error: `Gagal menghapus data: ${txErr.message}` }, { status: 500 });
        }

    } catch (error) {
        console.error('Delete Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
