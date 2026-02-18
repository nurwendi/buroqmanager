import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/security';

async function getCurrentUser(request) {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    return await verifyToken(token);
}

export async function GET(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let where = {};

        // NEW: Contextual Filtering based on Active Router
        const config = await (await import('@/lib/config')).getConfig();
        const { getUserConnectionId } = await import('@/lib/config');
        const connectionId = getUserConnectionId(currentUser, config);

        // Determine effective connection/owner
        let effectiveConnectionId = connectionId;

        // Fallback for staff/managers if not set directly
        if (!effectiveConnectionId && currentUser.ownerId) {
            const ownerConn = config.connections?.find(c => c.ownerId === currentUser.ownerId);
            if (ownerConn) effectiveConnectionId = ownerConn.id;
        }

        // Superadmin Fallback Logic (Align with Dashboard Stats)
        if (!effectiveConnectionId && currentUser.role === 'superadmin' && config.connections?.length > 0) {
            effectiveConnectionId = config.connections[0].id; // Default to first if none selected
        }

        // Apply filtering
        // 1. Admin/Manager: Always limited to their own scope
        if (currentUser.role === 'admin') {
            where = { ownerId: currentUser.id };
        } else if (currentUser.role === 'manager' && currentUser.ownerId) {
            where = { ownerId: currentUser.ownerId };
        }
        // 2. Staff: Limited to their owner
        else if (['agent', 'partner', 'technician', 'staff'].includes(currentUser.role)) {
            if (currentUser.ownerId) {
                where = { ownerId: currentUser.ownerId };
            } else {
                where = { ownerId: 'nothing' }; // Invalid state
            }
        }
        // 3. Superadmin: Context-aware
        else if (currentUser.role === 'superadmin') {
            // If we have an effective connection, filter by its owner
            const activeConnection = config.connections?.find(c => c.id === effectiveConnectionId);
            if (activeConnection && activeConnection.ownerId) {
                where = { ownerId: activeConnection.ownerId };
            } else {
                // Global view (or no owner assigned to router)
                where = {};
            }
        }

        const payments = await db.payment.findMany({ where });

        const totalRevenue = payments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        // Use Asia/Jakarta timezone for date calculations
        const now = new Date();
        const jakartaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const today = jakartaNow.toISOString().split('T')[0];
        const currentMonth = jakartaNow.toISOString().slice(0, 7); // YYYY-MM

        const todaysRevenue = payments
            .filter(p => {
                if (p.status !== 'completed') return false;
                const paymentDate = new Date(p.date);
                const jakartaPaymentDate = new Date(paymentDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                const paymentDay = jakartaPaymentDate.toISOString().split('T')[0];
                return paymentDay === today;
            })
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const thisMonthRevenue = payments
            .filter(p => {
                if (p.status !== 'completed') return false;
                const paymentDate = new Date(p.date);
                const jakartaPaymentDate = new Date(paymentDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                const paymentMonth = jakartaPaymentDate.toISOString().slice(0, 7);
                return paymentMonth === currentMonth;
            })
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const pendingCount = payments.filter(p => p.status === 'pending').length;

        const totalUnpaid = payments
            .filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        return NextResponse.json({
            totalRevenue,
            thisMonthRevenue,
            todaysRevenue,
            pendingCount,
            totalUnpaid,
            totalTransactions: payments.length
        });
    } catch (error) {
        console.error('Stats Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
