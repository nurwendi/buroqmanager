import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const daysParam = searchParams.get('days') || '3'; // Default to 3 days
        const days = parseInt(daysParam, 10);
        
        if (isNaN(days) || days <= 0) {
            return NextResponse.json({ error: 'Invalid days parameter' }, { status: 400 });
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        // Find tickets that are open or in_progress and haven't been updated since the cutoff date
        const ticketsToClose = await db.ticket.findMany({
            where: {
                status: { in: ['open', 'in_progress'] },
                updatedAt: { lt: cutoffDate }
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        let closedCount = 0;
        const closedTickets = [];

        for (const ticket of ticketsToClose) {
            // Check if the last message was from staff. If there are no messages, or last message was customer, 
            // we can still close it if they haven't replied to our staff's action or it has been abandoned.
            // Let's close it and write a system message.
            await db.$transaction([
                db.ticket.update({
                    where: { id: ticket.id },
                    data: { status: 'closed' }
                }),
                db.ticketMessage.create({
                    data: {
                        ticketId: ticket.id,
                        senderType: 'system',
                        senderId: 'system',
                        senderName: 'Sistem',
                        message: `Tiket ditutup secara otomatis oleh sistem karena tidak ada aktivitas selama ${days} hari.`
                    }
                })
            ]);

            closedCount++;
            closedTickets.push(ticket.ticketId);
        }

        return NextResponse.json({
            success: true,
            closedCount,
            closedTickets,
            message: `Successfully closed ${closedCount} tickets with no activity for ${days} days.`
        });

    } catch (error) {
        console.error('Auto-Close Tickets Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
