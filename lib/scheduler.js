import cron from 'node-cron';
import { createBackup } from './backup';

let isSchedulerRunning = false;

export function initScheduler() {
    if (isSchedulerRunning) {
        return;
    }

    console.log('Initializing Scheduler...');

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
            const fs = await import('fs/promises');
            const path = await import('path');

            const result = await generateInvoices();
            console.log(`[Cron] Generated ${result.generated} invoices.`);

            if (result.newPayments.length > 0) {
                const customerDataPath = path.join(process.cwd(), 'customer-data.json');
                let customerData = {};
                try {
                    customerData = JSON.parse(await fs.readFile(customerDataPath, 'utf8'));
                } catch (e) { /* ignore */ }

                for (const payment of result.newPayments) {
                    const customer = customerData[payment.username];
                    if (customer && customer.email) {
                        await sendInvoiceEmail(customer.email, {
                            ...payment,
                            customerName: customer.name || payment.username,
                            month: result.month,
                            year: result.year,
                            invoiceId: payment.id
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Scheduled invoice generation failed:', error);
        }
    });

    // Schedule Notification Sync (Runs every 1 minute)
    cron.schedule('* * * * *', async () => {
        try {
            const { isMikrotikConfigured } = await import('./mikrotik');
            if (!await isMikrotikConfigured()) return;

            const { syncNotifications } = await import('./notifications-db');
            await syncNotifications();
        } catch (error) {
            console.error('Scheduled notification sync failed:', error);
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

    isSchedulerRunning = true;
    console.log('Scheduler initialized.');
}
