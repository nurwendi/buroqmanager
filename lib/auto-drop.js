import { getMikrotikClient } from '@/lib/mikrotik';
import db from '@/lib/db';

/**
 * Get Auto Drop Date setting from database
 */
export async function getAutoDropSettings() {
    try {
        const setting = await db.systemSetting.findUnique({
            where: { key: 'auto_drop_date' }
        });
        return setting ? parseInt(setting.value, 10) : 10; // Default to 10th
    } catch (error) {
        console.error("Failed to get auto drop settings:", error);
        return 10;
    }
}

/**
 * Identify users who have NOT paid for the current month
 */
async function getUsersWithUnpaidInvoices() {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();

    // 1. Get all active customers (assuming we filter out 'disabled' ones if possible, but currently Customer model is simple)
    // We get all customers
    const customers = await db.customer.findMany({
        select: { username: true }
    });

    // 2. Get all COMPLETED payments for current month
    const paidInvoices = await db.payment.findMany({
        where: {
            month: currentMonth,
            year: currentYear,
            status: 'completed'
        },
        select: { username: true }
    });

    const paidUsernames = new Set(paidInvoices.map(p => p.username));

    // 3. Filter customers who are NOT in the paid list
    // We only care about users who exist in DB. 
    // Excluding specific usernames like 'admin' or system accounts if they are in Customer table (usually they aren't)
    const unpaidUsers = customers
        .filter(c => !paidUsernames.has(c.username))
        .map(c => c.username);

    return unpaidUsers;
}

/**
 * Main function to check and drop users
 */
export async function checkAndDropUsers() {
    // 1. Get Auto Drop Date Settings
    const autoDropDate = await getAutoDropSettings();
    const now = new Date();
    const currentDate = now.getDate();

    // Check if today is before the auto drop date
    if (currentDate < autoDropDate) {
        return {
            message: `Belum tanggal jatuh tempo (Tanggal: ${autoDropDate}). Auto-isolir tidak dijalankan.`,
            droppedUsers: [],
            totalUnpaid: 0,
            isEarly: true
        };
    }

    // 2. Get unpaid users
    const unpaidUsers = await getUsersWithUnpaidInvoices();

    if (unpaidUsers.length === 0) {
        return {
            message: 'Semua pelanggan sudah lunas atau tidak ada tagihan.',
            droppedUsers: [],
            totalUnpaid: 0
        };
    }

    // 3. Connect to Mikrotik
    let client;
    try {
        client = await getMikrotikClient();
    } catch (err) {
        throw new Error('Gagal koneksi ke Mikrotik: ' + err.message);
    }

    const droppedUsers = [];
    const errors = [];

    // 4. Process each unpaid user
    for (const username of unpaidUsers) {
        try {
            // Check if user exists in PPP Secret
            const secrets = await client.write('/ppp/secret/print', [
                `?name=${username}`
            ]);

            if (secrets && secrets.length > 0) {
                const secret = secrets[0];

                // Only drop if not already dropped to save resources (optional)
                // But force set is safer to ensure compliance
                if (secret.profile !== 'DROP') {
                    // Update profile to DROP
                    await client.write('/ppp/secret/set', [
                        `=.id=${secret['.id']}`,
                        '=profile=DROP',
                        '=comment=AUTO-ISOLIR-UNPAID'
                    ]);

                    droppedUsers.push(username);

                    // Remove active connection to force reconnection with new profile
                    const activeConnections = await client.write('/ppp/active/print', [
                        `?name=${username}`
                    ]);

                    if (activeConnections && activeConnections.length > 0) {
                        for (const conn of activeConnections) {
                            await client.write('/ppp/active/remove', [
                                `=.id=${conn['.id']}`
                            ]);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to drop user ${username}:`, error);
            errors.push(`${username}: ${error.message}`);
        }
    }

    return {
        message: `Berhasil mengisolir: ${droppedUsers.length} pelanggan.`,
        droppedUsers,
        totalUnpaid: unpaidUsers.length,
        errors: errors.length > 0 ? errors : undefined
    };
}

