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

            // Initialize 12 months data
            const yearlyData = Array.from({ length: 12 }, (_, i) => ({
                name: new Date(0, i).toLocaleString('id-ID', { month: 'short' }),
                monthIndex: i,
                revenue: 0,
                commission: 0,
                paidCount: 0
            }));

            // Fetch payments for the year
            let where = {
                date: {
                    gte: new Date(`${year}-01-01`),
                    lt: new Date(`${parseInt(year) + 1}-01-01`)
                }
            };

            // Filter by Owner
            if (currentUser.role !== 'superadmin') {
                const ownerId = currentUser.role === 'admin' ? currentUser.id : currentUser.ownerId;
                if (ownerId) where.ownerId = ownerId;
                else if (currentUser.role !== 'admin') {
                    // unowned staff?
                    where.ownerId = 'nothing';
                }
            }

            const payments = await db.payment.findMany({
                where,
                include: { commissions: true }
            });

            // Iterate and Aggregate
            for (const p of payments) {
                const pDate = new Date(p.date); // or use p.month if reliable
                const mIndex = pDate.getMonth();

                if (p.status === 'completed') {
                    const amount = p.amount;

                    if (currentUser.role === 'admin') {
                        yearlyData[mIndex].revenue += amount;
                        // Sum commissions
                        const commTotal = p.commissions.reduce((sum, c) => sum + c.amount, 0);
                        yearlyData[mIndex].commission += commTotal;
                    }
                    else {
                        // Partner view (Agent/Tech)
                        // Check if this user received commission on this payment
                        const myCommission = p.commissions.find(c => c.userId === currentUser.id);
                        if (myCommission) {
                            yearlyData[mIndex].commission += myCommission.amount;
                            // Count revenue if I am the primary reason (e.g. agent).
                            // If I am technician, do I count revenue?
                            // Logic in original code:
                            // Agent: revenue += amount
                            // Tech: revenue += amount ONLY if not already counted (i.e. if not also agent)

                            if (myCommission.role === 'agent') {
                                yearlyData[mIndex].revenue += amount;
                                yearlyData[mIndex].paidCount += 1;
                            } else if (myCommission.role === 'technician') {
                                // Check if I am also the agent for this txn? 
                                // The commissions list has all.
                                const isAlsoAgent = p.commissions.some(c => c.userId === currentUser.id && c.role === 'agent');
                                if (!isAlsoAgent) {
                                    yearlyData[mIndex].revenue += amount;
                                    yearlyData[mIndex].paidCount += 1;
                                }
                            }
                        }
                    }
                }
            }

            return NextResponse.json({
                role: currentUser.role,
                year: parseInt(year),
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

            for (const p of filteredPayments) {
                if (p.status === 'completed') {
                    grandTotalRevenue += p.amount;
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
                        partnerStats[ownerId].totalRevenue += p.amount;
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
                            partnerStats[comm.userId] = {
                                id: comm.userId,
                                name: comm.username,
                                role: 'staff',
                                paidCount: 0,
                                unpaidCount: 0,
                                totalRevenue: 0,
                                commission: 0
                            };
                        }

                        if (p.status === 'completed') {
                            partnerStats[comm.userId].commission += comm.amount;
                            grandTotalCommission += comm.amount;

                            // Prevent double counting revenue/count if user has multiple roles (Agent + Tech)
                            if (!processedUsersForPayment.has(comm.userId)) {
                                partnerStats[comm.userId].totalRevenue += p.amount;
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
                const myComms = p.commissions.filter(c => c.userId === currentUser.id);

                if (myComms.length > 0) {
                    if (p.status === 'completed') {
                        for (const c of myComms) {
                            myStats.commission += c.amount;
                        }
                        // Revenue: Count once per payment
                        myStats.totalRevenue += p.amount;
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
