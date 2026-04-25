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
        const newPayments = [];

        // 3. Iterate over Customers (The source of truth for billing)
        for (const customer of customers) {
            const username = customer.username;
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
                console.warn(`[Invoice Gen] No price found for customer ${username}. Skipping.`);
                skippedCount++;
                continue;
            }

            // Check for existing invoice for THIS month/year
            const existingInvoice = await db.payment.findFirst({
                where: {
                    username: username,
                    month: currentMonth,
                    year: currentYear,
                    status: { not: 'cancelled' }
                }
            });

            if (existingInvoice) {
                skippedCount++;
                continue;
            }

            // Generation logic...
            const count = await db.payment.count({
                where: { year: currentYear }
            });
            
            const yy = String(currentYear).slice(-2);
            const mm = String(currentMonth + 1).padStart(2, '0');
            const seq = String(count + 1).padStart(6, '0');
            const cleanCustId = (customer.customerId || 'CUST').replace(/\s+/g, '-');
            const invoiceNumber = `INV/${yy}/${mm}/${cleanCustId}/${seq}`;
            const invoiceDate = new Date(currentYear, currentMonth, 1);

            // Handle Arrears (Previous pending invoices)
            const pendingInvoice = await db.payment.findFirst({
                where: {
                    username: username,
                    status: 'pending'
                },
                orderBy: { date: 'desc' }
            });

            let finalAmount = amount;
            let notes = `Monthly Bill - ${profileName}`;

            if (pendingInvoice && pendingInvoice.month !== currentMonth) {
                // Merge past pending into new invoice
                await db.payment.update({
                    where: { id: pendingInvoice.id },
                    data: { status: 'merged' }
                });
                finalAmount += pendingInvoice.amount;
                notes = `Merged invoice. Prev: ${pendingInvoice.invoiceNumber}`;
            }

            const newPayment = await db.payment.create({
                data: {
                    invoiceNumber,
                    username,
                    amount: finalAmount,
                    method: 'cash',
                    status: 'pending',
                    date: invoiceDate,
                    month: currentMonth,
                    year: currentYear,
                    notes: notes,
                    ownerId: customer.ownerId
                }
            });

            newPayments.push(newPayment);
            newInvoicesCount++;
        }

        console.log(`Generated ${newInvoicesCount} new invoices. Skipped ${skippedCount}.`);
        return {
            success: true,
            generated: newInvoicesCount,
            skipped: skippedCount,
            month: currentMonth,
            year: currentYear,
            newPayments: newPayments
        };
    } catch (error) {
        console.error('Error generating invoices:', error);
        return { success: false, error: error.message };
    }
}


        console.log(`Generated ${newInvoicesCount} new invoices.`);
        return {
            success: true,
            generated: newInvoicesCount,
            skipped: skippedCount,
            month: currentMonth,
            year: currentYear,
            newPayments: newPayments
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

        for (const payment of pendingPayments) {
            // Find customer to get their internal ID for notification
            const customer = await db.customer.findFirst({
                where: { username: payment.username, ownerId: payment.ownerId }
            });

            if (customer) {
                await sendNotification({
                    title: 'Pengingat Tagihan',
                    message: `Tagihan Anda sebesar ${formatCurrency(payment.amount)} untuk Invoice ${payment.invoiceNumber} belum terbayar. Harap segera melakukan pembayaran.`,
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

