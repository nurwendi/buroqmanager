import cron from 'node-cron';
import { createBackup } from './backup';

let isSchedulerRunning = false;

export function initScheduler() {
    if (isSchedulerRunning) {
        return;
    }

    // Prevent duplicate cron execution across multi-core cluster workers
    const isPrimaryWorker = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';
    if (!isPrimaryWorker) {
        console.log(`[Scheduler] Skipping cron initialization on worker instance #${process.env.NODE_APP_INSTANCE}.`);
        return;
    }

    console.log('Initializing Scheduler on primary worker...');

    // Schedule Database Backup Weekly (Sunday at 00:00)
    cron.schedule('0 0 * * 0', async () => {
        console.log('Running scheduled daily backup...');
        try {
            const backup = await createBackup();
            console.log(`Daily DB backup created: ${backup.filename}`);
        } catch (error) {
            console.error('Scheduled backup failed:', error);
        }
    });

    // Schedule Mikrotik Backup Weekly (Sunday at 00:10)
    cron.schedule('10 0 * * 0', async () => {
        console.log('Running scheduled weekly Mikrotik backup...');
        try {
            const { isMikrotikConfigured } = await import('./mikrotik');
            if (await isMikrotikConfigured()) {
                const { createMikrotikBackup } = await import('./mikrotik-backup');
                const result = await createMikrotikBackup();
                console.log('Weekly Mikrotik backup completed:', result);
            } else {
                console.log('Skipping Mikrotik backup: Not configured.');
            }
        } catch (error) {
            console.error('Scheduled Mikrotik backup failed:', error);
        }
    });

    // Schedule Auto-Drop Check (Runs daily at 01:00 AM)
    cron.schedule('0 1 * * *', async () => {
        console.log('Running scheduled auto-drop check...');
        try {
            const { checkAndDropUsers } = await import('./auto-drop');
            // We pass manual: false (default), so it respects each admin's individual date setting.
            const result = await checkAndDropUsers();
            console.log('Auto-drop result:', result);
        } catch (error) {
            console.error('Scheduled auto-drop failed:', error);
        }
    });

    // Schedule Data Usage Sync (Runs every 5 minutes)
    cron.schedule('*/5 * * * *', async () => {
        try {
            const { isMikrotikConfigured } = await import('./mikrotik');
            if (!await isMikrotikConfigured()) return;

            const { syncUsage } = await import('./usage-tracker');
            await syncUsage();
        } catch (error) {
            console.error('Scheduled usage sync failed:', error);
        }
    });

    // Schedule Traffic Monitoring (Removed)
    // cron.schedule('*/5 * * * *', async () => {
    //     try {
    //         const { isMikrotikConfigured } = await import('./mikrotik');
    //         if (!await isMikrotikConfigured()) return;
    //         // const { collectTrafficData } = await import('./traffic-monitor');
    //         // await collectTrafficData();
    //     } catch (error) {
    //         console.error('Scheduled traffic collection failed:', error);
    //     }
    // });

    // Schedule Monthly Invoice Generation (1st of month at 07:00)
    cron.schedule('0 7 1 * *', async () => {
        console.log('Running scheduled invoice generation...');
        try {
            const { generateInvoices } = await import('./billing');
            const { sendInvoiceEmail } = await import('./email');
            const { getConfig } = await import('./config');
            const db = (await import('./db')).default;
            const { sendNotification } = await import('./notifications-db');

            const config = await getConfig();
            const connections = config.connections || [];

            for (const conn of connections) {
                console.log(`[Cron] Generating invoices for router: ${conn.name} (Owner: ${conn.ownerId})`);
                const result = await generateInvoices(undefined, undefined, conn.id, conn.ownerId);
                console.log(`[Cron] Router ${conn.name}: Generated ${result.generated} invoices. Skipped ${result.skipped}.`);

                if (result.newPayments && result.newPayments.length > 0) {
                    const usernames = [...new Set(result.newPayments.map(p => p.username))];
                    const customers = await db.customer.findMany({
                        where: {
                            username: { in: usernames },
                            ...(conn.ownerId ? { ownerId: conn.ownerId } : {})
                        },
                        select: { id: true, username: true, name: true, email: true, ownerId: true }
                    });
                    const customerMap = new Map(
                        customers.map(c => [`${c.ownerId || ''}:${c.username}`, c])
                    );

                    const pushRecipients = [];

                    for (const payment of result.newPayments) {
                        const customer = customerMap.get(`${payment.ownerId || ''}:${payment.username}`)
                            || customers.find(c => c.username === payment.username);

                        if (customer) {
                            // Send Email if available
                            if (customer.email) {
                                try {
                                    await sendInvoiceEmail(customer.email, {
                                        ...payment,
                                        customerName: customer.name || payment.username,
                                        month: result.month,
                                        year: result.year,
                                        invoiceId: payment.id || payment.invoiceNumber
                                    });
                                } catch (e) {
                                    console.error(`[Cron] Failed to send invoice email to ${customer.email}:`, e.message);
                                }
                            }

                            pushRecipients.push({ customerId: customer.id });
                        }
                    }

                    // Send batched Push Notification for this router's newly billed customers
                    if (pushRecipients.length > 0) {
                        try {
                            await sendNotification({
                                title: 'Tagihan Baru Terbit',
                                message: `Tagihan internet Anda untuk periode ${result.month + 1}/${result.year} telah terbit. Silakan cek detail tagihan di aplikasi.`,
                                type: 'info',
                                ownerId: conn.ownerId || null,
                                recipients: pushRecipients
                            });
                        } catch (e) {
                            console.error(`[Cron] Failed to send batched push notifications for router ${conn.name}:`, e.message);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Scheduled invoice generation failed:', error);
        }
    });

    // Schedule Log Sync (Runs every 1 minute)
    cron.schedule('* * * * *', async () => {
        try {
            const { isMikrotikConfigured } = await import('./mikrotik');
            if (!await isMikrotikConfigured()) return;

            const { syncLogs } = await import('./logs-db');
            await syncLogs();
        } catch (error) {
            console.error('Scheduled log sync failed:', error);
        }
    });

    // Schedule Payment Reminders (Runs daily at 09:00 AM)
    cron.schedule('0 9 * * *', async () => {
        try {
            const { checkPaymentReminders } = await import('./billing');
            await checkPaymentReminders();
        } catch (error) {
            console.error('Scheduled payment reminder check failed:', error);
        }
    });

    // Schedule Ticket Auto-Close Check (Runs every hour)
    cron.schedule('0 * * * *', async () => {
        try {
            const { checkAndAutoCloseTickets } = await import('./ticket-cron.js');
            await checkAndAutoCloseTickets();
        } catch (error) {
            console.error('Scheduled ticket auto-close check failed:', error);
        }
    });

    // Schedule Database Maintenance / Pruning (Runs daily at 02:30 AM)
    cron.schedule('30 2 * * *', async () => {
        try {
            const { pruneOldRecords } = await import('./logs-db');
            await pruneOldRecords(30);
        } catch (error) {
            console.error('Scheduled DB pruning failed:', error);
        }
    });

    isSchedulerRunning = true;
    console.log('Scheduler initialized.');
}
