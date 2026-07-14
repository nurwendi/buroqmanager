import { NextResponse } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import db from '@/lib/db';

// GET: Fetch a single ticket with its messages
export async function GET(request, { params }) {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    try {
        const ticket = await db.ticket.findUnique({
            where: { id },
            include: {
                customer: {
                    select: {
                        id: true,
                        customerId: true,
                        name: true,
                        phone: true,
                        address: true,
                        email: true,
                        agentId: true,
                        technicianId: true
                    }
                },
                technician: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        role: true
                    }
                },
                messages: {
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            }
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Authorization check
        if (user.role === 'customer' && ticket.customerId !== user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        if (user.role === 'technician' && ticket.technicianId !== user.id && ticket.category === 'teknis' && ticket.technicianId !== null && ticket.customer?.technicianId !== user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        if ((user.role === 'agent' || user.role === 'partner') && ticket.technicianId !== user.id && ticket.customer?.agentId !== user.id && ticket.customer?.technicianId !== user.id && !(ticket.category === 'tagihan' && ticket.technicianId === null)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json(ticket);
    } catch (error) {
        console.error(`[GET /api/tickets/${id}] Error:`, error);
        return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
    }
}

// PATCH: Update ticket properties (assign technician, update status, priority)
export async function PATCH(request, { params }) {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    try {
        const body = await request.json();
        const { status, priority, technicianId } = body;

        const ticket = await db.ticket.findUnique({
            where: { id },
            include: { customer: true }
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        // Authorization checks for editing
        if (user.role === 'customer') {
            // Customers can only close/cancel their own open tickets
            if (status && status !== 'closed') {
                return NextResponse.json({ error: 'Customers can only close their tickets' }, { status: 403 });
            }
            if (ticket.customerId !== user.id) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        }

        const updateData = {};

        if (status) {
            updateData.status = status;
            if (status === 'resolved' || status === 'closed') {
                updateData.resolvedAt = new Date();
            }
        }

        if (priority && (user.role === 'admin' || user.role === 'superadmin')) {
            updateData.priority = priority;
        }

        if (technicianId !== undefined && (user.role === 'admin' || user.role === 'superadmin')) {
            updateData.technicianId = technicianId;
        }

        // If a technician wants to mark a ticket as in-progress or resolved
        if (user.role === 'technician' || user.role === 'agent' || user.role === 'partner') {
            if (ticket.technicianId !== user.id) {
                return NextResponse.json({ error: 'Ticket is not assigned to you' }, { status: 403 });
            }
            if (status && !['in_progress', 'resolved'].includes(status)) {
                return NextResponse.json({ error: 'Invalid status update for staff' }, { status: 403 });
            }
        }

        const updatedTicket = await db.ticket.update({
            where: { id },
            data: updateData,
            include: {
                technician: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        role: true
                    }
                }
            }
        });

        // Trigger notifications for status updates
        if (status) {
            const customerNotification = await db.notification.create({
                data: {
                    type: 'ticket_reply',
                    title: `Status Tiket Diubah: ${ticket.ticketId}`,
                    message: `Tiket Anda "${ticket.title}" kini berstatus: ${status === 'resolved' ? 'Selesai' : status === 'in_progress' ? 'Sedang Diproses' : status}`,
                    ticketId: ticket.id,
                    ownerId: ticket.ownerId
                }
            });

            await db.notificationRecipient.create({
                data: {
                    notificationId: customerNotification.id,
                    customerId: ticket.customerId
                }
            });
        }

        return NextResponse.json(updatedTicket);
    } catch (error) {
        console.error(`[PATCH /api/tickets/${id}] Error:`, error);
        return NextResponse.json({ error: error.message || 'Failed to update ticket' }, { status: 500 });
    }
}
