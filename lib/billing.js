import { getAllActiveUsers, getPppoeProfiles } from './mikrotik.js';
import db from './db';

// Stub functions to avoid MikroTik dependency
// Helper to format currency
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
};

export async function generateInvoices(targetMonth, targetYear, connectionId = null, ownerId = null) {
    try {
        console.log(`Starting invoice generation (Owner: ${ownerId || 'All'}, Connection: ${connectionId || 'Default'})...`);
        
        const now = new Date();
        const currentMonth = targetMonth !== undefined ? parseInt(targetMonth) : now.getMonth();
        const currentYear = targetYear !== undefined ? parseInt(targetYear) : now.getFullYear();

        // 1. Fetch Customers from DB and Profiles from Mikrotik (if available)
        const whereClause = ownerId ? { ownerId } : {};
        const [customers, mikrotikSecrets, mikrotikProfiles] = await Promise.all([
            db.customer.findMany({ 
                where: whereClause,
                include: { profile: true }
            }),
            getAllActiveUsers(connectionId).catch(() => []),
            getPppoeProfiles(connectionId).catch(() => [])
        ]);

        console.log(`Processing ${customers.length} customers. Found ${mikrotikSecrets.length} Mikrotik secrets.`);

        // 2. Create optimized maps for lookup
        const secretMap = mikrotikSecrets.reduce((acc, s) => {
            acc[s.name] = s;
            return acc;
        }, {});

        const profilePriceMap = mikrotikProfiles.reduce((acc, p) => {
            if (p.comment) {
                const priceMatch = p.comment.match(/(?:Rp\.?|IDR|Rate|Price)?\s*(\d+(?:\.\d+)*)/i);
                if (priceMatch) {
                    const rawNum = priceMatch[1].replace(/\./g, '');
                    const parsed = parseInt(rawNum);
                    if (!isNaN(parsed) && parsed > 5000) acc[p.name] = parsed;
                }
            }
            return acc;
        }, {});

        let newInvoicesCount = 0;
        let skippedCount = 0;

        // 3. Batch-fetch existing invoices for this month/year and all pending arrears
        const paymentScopeWhere = ownerId ? { ownerId } : {};
        const [baseSeqCount, existingMonthInvoices, pendingArrearsInvoices] = await Promise.all([
            db.payment.count({ where: { year: currentYear } }),
            db.payment.findMany({
                where: {
                    ...paymentScopeWhere,
                    month: currentMonth,
                    year: currentYear,
                    status: { not: 'cancelled' }
                },
                select: { id: true, username: true, ownerId: true }
            }),
            db.payment.findMany({
                where: {
                    ...paymentScopeWhere,
                    status: 'pending'
                },
                orderBy: { date: 'desc' },
                select: { id: true, invoiceNumber: true, username: true, ownerId: true, amount: true, month: true, year: true }
            })
        ]);

        let baseSeq = baseSeqCount;

        // Map key helper: `${ownerId || ''}:${username}`
        const existingMonthSet = new Set(
            existingMonthInvoices.map(inv => `${inv.ownerId || ''}:${inv.username}`)
        );

        // Store the most recent pending invoice (from a previous month/year) per customer
        const pendingArrearsMap = new Map();
        for (const inv of pendingArrearsInvoices) {
            if (inv.month !== currentMonth || inv.year !== currentYear) {
                const key = `${inv.ownerId || ''}:${inv.username}`;
                if (!pendingArrearsMap.has(key)) {
                    pendingArrearsMap.set(key, inv);
                }
            }
        }

        const invoiceDate = new Date(currentYear, currentMonth, 1);
        const yy = String(currentYear).slice(-2);
        const mm = String(currentMonth + 1).padStart(2, '0');

        const paymentsToCreate = [];
        const pendingIdsToMerge = [];

        // 4. Iterate over Customers in memory (zero DB queries inside loop)
        for (const customer of customers) {
            const username = customer.username;
            const targetOwnerId = customer.ownerId || ownerId || null;
            const lookupKey = `${targetOwnerId || ''}:${username}`;

            if (existingMonthSet.has(lookupKey)) {
                skippedCount++;
                continue;
            }

            const secret = secretMap[username];
            
            // Determine price logic:
            // Priority 1: Mikrotik Secret Comment (most specific settings)
            // Priority 2: Database Profile Price
            // Priority 3: Mikrotik Profile Comment
            let amount = 0;
            let profileName = customer.profile?.name || (secret ? secret.profile : 'None');

            // Try Secret Comment
            if (secret && secret.comment) {
                const priceMatch = secret.comment.match(/(?:Rp\.?|IDR|Rate|Price)?\s*(\d+(?:\.\d+)*)/i);
                if (priceMatch) {
                    const rawNum = priceMatch[1].replace(/\./g, '');
                    const parsed = parseInt(rawNum);
                    if (!isNaN(parsed) && parsed > 5000) amount = parsed;
                }
            }

            // Fallback to DB Profile Price
            if (amount === 0 && customer.profile && customer.profile.price > 0) {
                amount = customer.profile.price;
            }

            // Fallback to Mikrotik Profile Comment
            if (amount === 0 && secret && secret.profile && profilePriceMap[secret.profile]) {
                amount = profilePriceMap[secret.profile];
                profileName = secret.profile;
            }

            if (amount === 0) {
                skippedCount++;
                continue;
            }

            baseSeq++;
            const seq = String(baseSeq).padStart(6, '0');
            const cleanCustId = (customer.customerId || 'CUST').replace(/\s+/g, '-');
            const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const invoiceNumber = `INV/${yy}/${mm}/${cleanCustId}/${seq}-${uniqueSuffix}`;

            const pendingInvoice = pendingArrearsMap.get(lookupKey);
            let finalAmount = amount;
            let notes = `Monthly Bill - ${profileName}`;

            if (pendingInvoice) {
                pendingIdsToMerge.push(pendingInvoice.id);
                finalAmount += Number(pendingInvoice.amount || 0);
                notes = `Merged invoice. Prev: ${pendingInvoice.invoiceNumber}`;
            }

            paymentsToCreate.push({
                invoiceNumber,
                username,
                amount: finalAmount,
                method: 'cash',
                status: 'pending',
                date: invoiceDate,
                month: currentMonth,
                year: currentYear,
                notes,
                ownerId: targetOwnerId
            });

            // Prevent duplicate generation if same username/ownerId appears twice
            existingMonthSet.add(lookupKey);
            newInvoicesCount++;
        }

        // 5. Execute batch database updates & inserts in chunks of 1000
        const CHUNK_SIZE = 1000;
        for (let i = 0; i < pendingIdsToMerge.length; i += CHUNK_SIZE) {
            const chunkIds = pendingIdsToMerge.slice(i, i + CHUNK_SIZE);
            await db.payment.updateMany({
                where: { id: { in: chunkIds } },
                data: { status: 'merged' }
            });
        }

        for (let i = 0; i < paymentsToCreate.length; i += CHUNK_SIZE) {
            const chunkData = paymentsToCreate.slice(i, i + CHUNK_SIZE);
            await db.payment.createMany({
                data: chunkData,
                skipDuplicates: true
            });
        }

        console.log(`Generated ${newInvoicesCount} new invoices. Skipped ${skippedCount}.`);
        return {
            success: true,
            generated: newInvoicesCount,
            skipped: skippedCount,
            month: currentMonth,
            year: currentYear,
            newPayments: paymentsToCreate
        };
    } catch (error) {
        console.error('Error generating invoices:', error);
        return { success: false, error: error.message };
    }
}



export async function checkPaymentReminders() {
    try {
        const pendingPayments = await db.payment.findMany({
            where: { status: 'pending' },
            include: { owner: true }
        });

        console.log(`[Reminders] Checking ${pendingPayments.length} pending payments...`);

        const { sendNotification } = await import('./notifications-db');
        const today = new Date();
        const eligiblePayments = [];

        for (const payment of pendingPayments) {
            const owner = payment.owner;
            if (!owner || !owner.autoIsolationDate) continue;

            // Calculate the isolation date for the current month
            const isoDate = new Date(today.getFullYear(), today.getMonth(), owner.autoIsolationDate);
            
            // The reminder should be exactly 5 days before isolation date
            const reminderDate = new Date(isoDate);
            reminderDate.setDate(reminderDate.getDate() - 5);

            // Check if today is exactly the reminder date
            const isReminderDay = today.getFullYear() === reminderDate.getFullYear() &&
                                  today.getMonth() === reminderDate.getMonth() &&
                                  today.getDate() === reminderDate.getDate();

            if (isReminderDay) {
                eligiblePayments.push(payment);
            }
        }

        if (eligiblePayments.length === 0) return;

        // Batch-fetch all customers for eligible payments in a single query (eliminates N+1)
        const usernames = [...new Set(eligiblePayments.map(p => p.username))];
        const customers = await db.customer.findMany({
            where: { username: { in: usernames } },
            select: { id: true, username: true, ownerId: true }
        });
        const customerMap = new Map(
            customers.map(c => [`${c.ownerId || ''}:${c.username}`, c])
        );

        for (const payment of eligiblePayments) {
            const customer = customerMap.get(`${payment.ownerId || ''}:${payment.username}`)
                || customers.find(c => c.username === payment.username && (!payment.ownerId || c.ownerId === payment.ownerId));

            if (customer) {
                await sendNotification({
                    title: 'Pengingat Tagihan',
                    message: `Tagihan Anda sebesar ${formatCurrency(payment.amount)} untuk Invoice ${payment.invoiceNumber} akan jatuh tempo dalam 5 hari. Harap segera melakukan pembayaran.`,
                    type: 'alert',
                    ownerId: payment.ownerId,
                    recipients: [{ customerId: customer.id }]
                });
            }
        }
    } catch (error) {
        console.error('Error checking payment reminders:', error);
    }
}

