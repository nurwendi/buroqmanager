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
        if (currentUser.role === 'admin') {
            where = { ownerId: currentUser.id };
        } else if (currentUser.role === 'superadmin') {
            // Superadmin sees all
        } else {
            // Staff?
            if (currentUser.ownerId) {
                where = { ownerId: currentUser.ownerId };
            } else {
                // Fallback
                where = { ownerId: 'nothing' }; // block access or show empty
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
