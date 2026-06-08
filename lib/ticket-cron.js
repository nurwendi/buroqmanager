export async function checkAndAutoCloseTickets() {
    console.log('[Cron] Checking for tickets to auto-close...');
    try {
        const db = (await import('./db')).default;
        const { sendNotification } = await import('./notifications-db');

        // 48 hours ago
        const deadline = new Date(Date.now() - 48 * 60 * 60 * 1000);

        // Find tickets that are not closed or resolved
        const openTickets = await db.ticket.findMany({
            where: {
                status: { notIn: ['closed', 'resolved'] },
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        let closedCount = 0;

        for (const ticket of openTickets) {
            // Check if there are messages
            if (ticket.messages && ticket.messages.length > 0) {
                const lastMessage = ticket.messages[0];
                
                // If last message is NOT from a customer AND was sent before the deadline
                // This correctly respects the rule: don't close if waiting on staff
                if (lastMessage.senderType !== 'customer' && new Date(lastMessage.createdAt) < deadline) {
                    // Update ticket status
                    await db.ticket.update({
                        where: { id: ticket.id },
                        data: {
                            status: 'closed',
                            resolvedAt: new Date()
                        }
                    });

                    // Add a system message explaining the closure
                    await db.ticketMessage.create({
                        data: {
                            ticketId: ticket.id,
                            senderType: 'system',
                            senderId: 'system',
                            senderName: 'System',
                            message: 'Tiket ditutup otomatis karena tidak ada respons dari pelanggan selama 2x24 jam.'
                        }
                    });

                    // Send notification to customer
                    try {
                        await sendNotification({
                            title: 'Tiket Ditutup Otomatis',
                            message: `Tiket #${ticket.ticketId} (${ticket.title}) telah ditutup otomatis karena tidak ada respons selama 2x24 jam.`,
                            type: 'info',
                            ownerId: ticket.ownerId,
                            ticketId: ticket.id,
                            recipients: [{ customerId: ticket.customerId }]
                        });
                    } catch (e) {
                        console.error('[Cron] Failed to send ticket auto-close notification:', e);
                    }

                    closedCount++;
                }
            }
        }

        if (closedCount > 0) {
            console.log(`[Cron] Auto-closed ${closedCount} tickets due to inactivity.`);
        }
    } catch (error) {
        console.error('[Cron] Error in checkAndAutoCloseTickets:', error);
    }
}
