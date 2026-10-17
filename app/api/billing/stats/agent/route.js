import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');
        const year = searchParams.get('year');

        // Get current user
        const currentUser = await getUserFromRequest(request);

        console.log('Agent Stats - Current User:', currentUser);

        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const type = searchParams.get('type');

        if (type === 'yearly') {
            if (!year) {
                return NextResponse.json({ error: 'Year is required for yearly stats' }, { status: 400 });
            }

            const targetYear = parseInt(year);

            // Initialize 12 months data
            const yearlyData = Array.from({ length: 12 }, (_, i) => ({
                name: new Date(0, i).toLocaleString('id-ID', { month: 'short' }),
                monthIndex: i,
                revenue: 0,
                commission: 0,
                paidCount: 0
            }));

            // Fetch payments for the year using indexed year + status
            let where = {
                year: targetYear,
                status: 'completed',
                method: { notIn: ['EXPENSE', 'expense'] }
            };

            // Filter by Owner
            if (currentUser.role !== 'superadmin') {
                const ownerId = currentUser.role === 'admin' ? currentUser.id : currentUser.ownerId;
                if (ownerId) where.ownerId = ownerId;
                else if (currentUser.role !== 'admin') {
                    where.ownerId = 'nothing';
                }
            }

            if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
                const [monthRevGroups, commissions] = await Promise.all([
                    db.payment.groupBy({
                        by: ['month'],
                        _sum: { amount: true },
                        _count: { _all: true },
                        where
                    }),
                    db.commission.findMany({
                        where: { payment: where },
                        select: { amount: true, payment: { select: { month: true } } }
                    })
                ]);

                for (const g of monthRevGroups) {
                    if (g.month >= 0 && g.month < 12) {
                        yearlyData[g.month].revenue = Number(g._sum.amount || 0);
                        yearlyData[g.month].paidCount = g._count._all || 0;
                    }
                }

                for (const c of commissions) {
                    const m = c.payment?.month;
                    if (m !== undefined && m >= 0 && m < 12) {
                        yearlyData[m].commission += Number(c.amount || 0);
                    }
                }
            } else {
                const myCommissions = await db.commission.findMany({
                    where: {
                        userId: currentUser.id,
                        payment: where
                    },
                    select: {
                        role: true,
                        amount: true,
                        paymentId: true,
                        payment: {
                            select: { month: true, amount: true }
                        }
                    }
                });

                const countedPaymentIds = new Set();
                for (const c of myCommissions) {
                    const mIndex = c.payment?.month;
                    if (mIndex === undefined || mIndex < 0 || mIndex >= 12) continue;

                    yearlyData[mIndex].commission += Number(c.amount || 0);
                    if (!countedPaymentIds.has(c.paymentId)) {
                        yearlyData[mIndex].revenue += Number(c.payment?.amount || 0);
                        yearlyData[mIndex].paidCount += 1;
                        countedPaymentIds.add(c.paymentId);
                    }
                }
            }

            return NextResponse.json({
                role: currentUser.role,
                year: targetYear,
                yearlyStats: yearlyData
            });
        }

        // Monthly Stats (default)
        // Filter payments by date/month/year
        let where = {};
        if (month && year) {
            where = {
                month: parseInt(month),
                year: parseInt(year)
            };
        }

        // Filter by Owner
        if (currentUser.role !== 'superadmin') {
            const ownerId = currentUser.role === 'admin' ? currentUser.id : currentUser.ownerId;
            if (ownerId) where.ownerId = ownerId;
            else if (currentUser.role !== 'admin') {
                where.ownerId = 'nothing';
            }
        }

        const filteredPayments = await db.payment.findMany({
            where,
            include: { commissions: true, owner: true }
        });

        // Debug logging
        console.log('=== Agent Stats Debug ===');
        console.log('Filtered Payments Count:', filteredPayments.length);

        // Calculate Stats
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
            // Admin View: All Staff
            const partnerStats = {};
            let grandTotalRevenue = 0;
            let grandTotalCommission = 0;

            // Get unique agent IDs involved in these payments
            const involvedAgentIds = new Set();
            filteredPayments.forEach(p => p.commissions.forEach(c => involvedAgentIds.add(c.userId)));

            const involvedAgents = await db.user.findMany({
                where: { id: { in: Array.from(involvedAgentIds) } },
                select: { id: true, agentRate: true, technicianRate: true, role: true }
            });
            const agentMap = involvedAgents.reduce((acc, a) => { acc[a.id] = a; return acc; }, {});

            for (const p of filteredPayments) {
                // Ignore EXPENSE
                if (p.method === 'EXPENSE' || p.method === 'expense') continue;

                if (p.status === 'completed') {
                    grandTotalRevenue += parseFloat(p.amount);
                }

                const processedUsersForPayment = new Set();

                if (p.commissions.length === 0) {
                    // No agent/tech -> Attribute to Owner (Admin)
                    const ownerId = p.ownerId || 'unknown';
                    if (!partnerStats[ownerId]) {
                        partnerStats[ownerId] = {
                            id: ownerId,
                            name: p.owner?.fullName || p.owner?.username || 'Unknown Owner',
                            role: 'admin',
                            paidCount: 0,
                            unpaidCount: 0,
                            totalRevenue: 0,
                            commission: 0
                        };
                    }

                    if (p.status === 'completed') {
                        partnerStats[ownerId].totalRevenue += parseFloat(p.amount);
                        partnerStats[ownerId].paidCount += 1;
                        // No commission for owner
                    } else {
                        partnerStats[ownerId].unpaidCount += 1;
                    }
                } else {
                    // Process Commissions
                    for (const comm of p.commissions) {
                        // Start/Update partner stats
                        if (!partnerStats[comm.userId]) {
                            const agentDetails = agentMap[comm.userId] || {};
                            partnerStats[comm.userId] = {
                                id: comm.userId,
                                name: comm.username,
                                role: agentDetails.role || 'staff',
                                rate: agentDetails.agentRate || 0,
                                technicianRate: agentDetails.technicianRate || 0,
                                paidCount: 0,
                                unpaidCount: 0,
                                totalRevenue: 0,
                                commission: 0
                            };
                        }

                        if (p.status === 'completed') {
                            partnerStats[comm.userId].commission += parseFloat(comm.amount);
                            grandTotalCommission += parseFloat(comm.amount);

                            // Prevent double counting revenue/count if user has multiple roles (Agent + Tech)
                            if (!processedUsersForPayment.has(comm.userId)) {
                                partnerStats[comm.userId].totalRevenue += parseFloat(p.amount);
                                partnerStats[comm.userId].paidCount += 1;
                                processedUsersForPayment.add(comm.userId);
                            }
                        } else {
                            if (!processedUsersForPayment.has(comm.userId)) {
                                partnerStats[comm.userId].unpaidCount += 1;
                                processedUsersForPayment.add(comm.userId);
                            }
                        }
                    }
                }
            }

            // Convert to array and sort (Owner first, then by revenue desc)
            const agentsArray = Object.values(partnerStats).sort((a, b) => {
                if (a.role === 'admin') return -1; // Owner first
                if (b.role === 'admin') return 1;
                return b.totalRevenue - a.totalRevenue;
            });

            return NextResponse.json({
                role: 'admin',
                agents: agentsArray,
                grandTotal: {
                    revenue: grandTotalRevenue,
                    commission: grandTotalCommission,
                    netRevenue: grandTotalRevenue - grandTotalCommission
                },
                _debug: {
                    filteredPaymentsCount: filteredPayments.length
                }
            });
        } else if (currentUser.role === 'staff' || currentUser.role === 'agent' || currentUser.role === 'technician' || currentUser.role === 'editor') {
            // Staff View
            const myStats = {
                totalRevenue: 0,
                commission: 0,
                paidCount: 0,
                unpaidCount: 0
            };

            for (const p of filteredPayments) {
                // Ignore EXPENSE
                if (p.method === 'EXPENSE' || p.method === 'expense') continue;

                const myComms = p.commissions.filter(c => c.userId === currentUser.id);

                if (myComms.length > 0) {
                    if (p.status === 'completed') {
                        for (const c of myComms) {
                            myStats.commission += parseFloat(c.amount);
                        }
                        // Revenue: Count once per payment
                        myStats.totalRevenue += parseFloat(p.amount);
                        myStats.paidCount += 1;
                    } else {
                        myStats.unpaidCount += 1;
                    }
                }
            }

            return NextResponse.json({
                role: 'staff',
                stats: myStats
            });
        } else {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

    } catch (error) {
        console.error('Stats Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
