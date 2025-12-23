import { getAllActiveUsers, getPppoeProfiles } from './mikrotik.js';
import db from './db';

// Stub functions to avoid MikroTik dependency
// Helper to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
};

export async function generateInvoices(targetMonth, targetYear, connectionId = null, ownerId = null) {
    try {
        console.log(`Starting invoice generation (Owner: ${ownerId || 'All'}, Connection: ${connectionId || 'Default'})...`);
        // Use provided values or default to current date
        const now = new Date();
        const currentMonth = targetMonth !== undefined ? parseInt(targetMonth) : now.getMonth();
        const currentYear = targetYear !== undefined ? parseInt(targetYear) : now.getFullYear();

        const [activeUsers, profiles] = await Promise.all([
            getAllActiveUsers(connectionId),
            getPppoeProfiles(connectionId)
        ]);
        console.log(`Found ${activeUsers.length} active users and ${profiles.length} profiles.`);

        // Create Profile Map: Name -> Price (from comment)
        const profilePriceMap = {};
        for (const p of profiles) {
            if (p.comment) {
                // Try multiple patterns
                // 1. "Rp 100.000" or "Rp.100.000" or "Rp100000"
                // 2. "100.000" or "100000" (look for large numbers)
                // 3. Simple number
                let price = 0;

                // Regex to find price-like patterns (digits with optional dots, possibly preceded by Rp)
                const priceMatch = p.comment.match(/(?:Rp\.?|IDR|Rate|Price)?\s*(\d+(?:\.\d+)*)/i);

                if (priceMatch) {
                    const rawNum = priceMatch[1].replace(/\./g, '');
                    const parsed = parseInt(rawNum);
                    // Filter out small numbers like "50" (Mbps) or dates
                    if (!isNaN(parsed) && parsed > 5000) {
                        price = parsed;
                    }
                }

                if (price > 0) {
                    profilePriceMap[p.name] = price;
                } else {
                    console.warn(`Could not parse price from profile ${p.name} comment: "${p.comment}"`);
                }
            }
        }

        // Fetch customers for mapping, filtered by Owner if provided
        const whereClause = ownerId ? { ownerId } : {};
        const customers = await db.customer.findMany({ where: whereClause });

        const customerMap = customers.reduce((acc, c) => {
            acc[c.username] = c;
            return acc;
        }, {});

        let newInvoicesCount = 0;
        let skippedCount = 0;
        const newPayments = [];

        for (const user of activeUsers) {
            const username = user.name;
            const customer = customerMap[username];
            const profileName = user.profile; // e.g. "50Mbps"

            // Determine price logic...
            let amount = 0;

            if (user.comment) {
                // Same flexible regex for user comment
                const priceMatch = user.comment.match(/(?:Rp\.?|IDR|Rate|Price)?\s*(\d+(?:\.\d+)*)/i);
                if (priceMatch) {
                    const rawNum = priceMatch[1].replace(/\./g, '');
                    const parsed = parseInt(rawNum);
                    if (!isNaN(parsed) && parsed > 5000) {
                        amount = parsed;
                    }
                }
            }

            if (amount === 0 && profileName && profilePriceMap[profileName]) {
                amount = profilePriceMap[profileName];
            }

            if (amount === 0) {
                console.warn(`No price found for user ${username} (Profile: ${profileName}). Setting to 0.`);
                // amount = 0; // Default is 0, no 150k fallback
            }

            // Check for existing invoice for THIS month/year
            const existingInvoice = await db.payment.findFirst({
                where: {
                    username: username,
                    month: currentMonth,
                    year: currentYear
                }
            });

            if (!existingInvoice) {
                // Check if there is a PENDING invoice from PREVIOUS month (Arrears)
                // Logic remains...

                // ... (existing logic for creating/merging invoice) ...

                const pendingInvoice = await db.payment.findFirst({
                    where: {
                        username: username,
                        status: 'pending'
                    },
                    orderBy: { date: 'desc' }
                });

                if (pendingInvoice) {
                    // Update old invoice to merged
                    await db.payment.update({
                        where: { id: pendingInvoice.id },
                        data: { status: 'merged' }
                    });

                    // Create new cumulative invoice
                    const totalAmount = amount + pendingInvoice.amount;

                    const count = await db.payment.count();
                    const yy = String(currentYear).slice(-2);
                    const mm = String(currentMonth + 1).padStart(2, '0');
                    const custNumber = customer?.customerId || '0000';
                    const seq = String(count + 1).padStart(4, '0');
                    const invoiceNumber = `INV/${yy}/${mm}/${custNumber}/${seq}`;

                    // Use first day of the target month for 'date' field to keep it consistent
                    const invoiceDate = new Date(currentYear, currentMonth, 1);

                    const newPayment = await db.payment.create({
                        data: {
                            invoiceNumber,
                            username,
                            amount: totalAmount,
                            method: 'cash',
                            status: 'pending',
                            date: invoiceDate,
                            month: currentMonth,
                            year: currentYear,
                            year: currentYear,
                            notes: `Merged invoice. Prev: ${pendingInvoice.invoiceNumber}`,
                            ownerId: customer?.ownerId // Add Owner ID from Customer
                        }
                    });

                    console.log(`Merged invoice for ${username}. New total: ${totalAmount}`);
                    newPayments.push(newPayment);
                } else {
                    // Create standard new invoice
                    const count = await db.payment.count();
                    const yy = String(currentYear).slice(-2);
                    const mm = String(currentMonth + 1).padStart(2, '0');
                    const custNumber = customer?.customerId || '0000';
                    const seq = String(count + 1).padStart(4, '0');
                    const invoiceNumber = `INV/${yy}/${mm}/${custNumber}/${seq}`;

                    const invoiceDate = new Date(currentYear, currentMonth, 1);

                    const newPayment = await db.payment.create({
                        data: {
                            invoiceNumber,
                            username,
                            amount: amount,
                            method: 'cash',
                            status: 'pending',
                            date: invoiceDate,
                            month: currentMonth,
                            year: currentYear,
                            notes: `Monthly Bill - ${profileName}`, // Fixed: user.profile -> profileName
                            ownerId: customer?.ownerId // Add Owner ID from Customer
                        }
                    });
                    newPayments.push(newPayment);
                }
                newInvoicesCount++;
            } else {
                skippedCount++;
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

