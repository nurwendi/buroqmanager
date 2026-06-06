import { NextResponse } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import db from '@/lib/db';

// GET: Fetch all messages for a ticket and mark unread messages as read for the receiver
export async function GET(request, { params }) {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { id: ticketId } = params;

    try {
        const ticket = await db.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Authorization check
        if (user.role === 'customer' && ticket.customerId !== user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const messages = await db.ticketMessage.findMany({
            where: { ticketId },
            orderBy: { createdAt: 'asc' }
        });

        // Mark messages as read depending on who is reading
        // If customer is reading, mark staff/admin messages as read
        // If staff is reading, mark customer messages as read
        let updateWhere = {
            ticketId,
            isRead: false
        };

        if (user.role === 'customer') {
            updateWhere.senderType = { in: ['technician', 'admin'] };
        } else {
            updateWhere.senderType = 'customer';
        }

        await db.ticketMessage.updateMany({
            where: updateWhere,
            data: {
                isRead: true,
                readAt: new Date()
            }
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error(`[GET /api/tickets/${ticketId}/messages] Error:`, error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

// POST: Send a message within a ticket
export async function POST(request, { params }) {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { id: ticketId } = params;

    try {
        const body = await request.json();
        const { message } = body;

        if (!message || message.trim() === '') {
            return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
        }

        const ticket = await db.ticket.findUnique({
            where: { id: ticketId },
            include: { customer: true }
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Determine sender type and name
        let senderType = 'admin';
        let senderName = user.fullName || user.username || 'System Admin';

        if (user.role === 'customer') {
            if (ticket.customerId !== user.id) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
            senderType = 'customer';
            senderName = ticket.customer.name;
        } else if (user.role === 'technician') {
            senderType = 'technician';
            // Only allow assigned technician or admin/superadmin to chat
            if (ticket.technicianId !== user.id) {
                return NextResponse.json({ error: 'Ticket not assigned to you' }, { status: 403 });
            }
        } else if (user.role === 'agent') {
            senderType = 'technician'; // treat agent as technical responder in logs/type for simplicity
            if (ticket.technicianId !== user.id) {
                return NextResponse.json({ error: 'Ticket not assigned to you' }, { status: 403 });
            }
        }

        // If the ticket was open, automatically update status to in_progress upon staff reply
        if (senderType !== 'customer' && ticket.status === 'open') {
            await db.ticket.update({
                where: { id: ticketId },
                data: { status: 'in_progress' }
            });
        }

        // Create message
        const ticketMessage = await db.ticketMessage.create({
            data: {
                ticketId,
                senderType,
                senderId: user.id,
                senderName,
                message: message.trim()
            }
        });

        // Touch the ticket's updatedAt field to bubble it to the top of list
        await db.ticket.update({
            where: { id: ticketId },
            data: { updatedAt: new Date() }
        });

        // Trigger notifications to the relevant counterparty
        const title = `Pesan Baru: ${ticket.ticketId}`;
        const previewText = message.length > 50 ? `${message.substring(0, 50)}...` : message;

        // 1. If customer sends a message -> notify assigned technician & owner/admin
        if (senderType === 'customer') {
            if (ticket.technicianId) {
                const staffNotif = await db.notification.create({
                    data: {
                        type: 'ticket_reply',
                        title,
                        message: `${senderName}: ${previewText}`,
                        ticketId: ticket.id,
                        ownerId: ticket.ownerId
                    }
                });
                await db.notificationRecipient.create({
                    data: {
                        notificationId: staffNotif.id,
                        userId: ticket.technicianId
                    }
                });
            }
        } 
        // 2. If staff (technician/agent) sends a message -> notify customer
        else if (senderType === 'technician') {
            const custNotif = await db.notification.create({
                data: {
                    type: 'ticket_reply',
                    title,
                    message: `${senderName} (Staff): ${previewText}`,
                    ticketId: ticket.id,
                    ownerId: ticket.ownerId
                }
            });
            await db.notificationRecipient.create({
                data: {
                    notificationId: custNotif.id,
                    customerId: ticket.customerId
                }
            });
        } 
        // 3. If Admin/Supervisor sends a message -> notify both Customer and Technician (Intervention)
        else if (senderType === 'admin') {
            const supervisorNotif = await db.notification.create({
                data: {
                    type: 'ticket_reply',
                    title: `Intervensi Supervisor: ${ticket.ticketId}`,
                    message: `Supervisor: ${previewText}`,
                    ticketId: ticket.id,
                    ownerId: ticket.ownerId
                }
            });

            // Notify Customer
            await db.notificationRecipient.create({
                data: {
                    notificationId: supervisorNotif.id,
                    customerId: ticket.customerId
                }
            });

            // Notify Technician if assigned
            if (ticket.technicianId) {
                await db.notificationRecipient.create({
                    data: {
                        notificationId: supervisorNotif.id,
                        userId: ticket.technicianId
                    }
                });
            }
        }

        return NextResponse.json(ticketMessage);
    } catch (error) {
        console.error(`[POST /api/tickets/${ticketId}/messages] Error:`, error);
        return NextResponse.json({ error: error.message || 'Failed to send message' }, { status: 500 });
    }
}
