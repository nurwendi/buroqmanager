import { NextResponse } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import db from '@/lib/db';

// GET: List tickets based on user role
export async function GET(request) {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const category = searchParams.get('category');

        const where = {};

        // Role-based filtering
        if (user.role === 'customer') {
            where.customerId = user.id;
        } else if (user.role === 'technician') {
            // Show tickets assigned to this technician or unassigned technical tickets
            where.OR = [
                { technicianId: user.id },
                { AND: [{ category: 'teknis' }, { technicianId: null }] }
            ];
        } else if (user.role === 'agent') {
            // Show tickets assigned to this agent or unassigned billing tickets
            where.OR = [
                { technicianId: user.id },
                { AND: [{ category: 'tagihan' }, { technicianId: null }] }
            ];
        } else if (user.role === 'admin' || user.role === 'superadmin') {
            // Admins can see everything, optionally filtered by ownerId
            if (user.ownerId) {
                where.ownerId = user.ownerId;
            }
        }

        // Apply query filters
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (category) where.category = category;

        const tickets = await db.ticket.findMany({
            where,
            include: {
                customer: {
                    select: {
                        id: true,
                        customerId: true,
                        name: true,
                        phone: true,
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
                _count: {
                    select: {
                        messages: {
                            where: { isRead: false }
                        }
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        return NextResponse.json(tickets);
    } catch (error) {
        console.error('[GET /api/tickets] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
    }
}

// POST: Create a new ticket (usually by customer)
export async function POST(request) {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    try {
        const body = await request.json();
        const { title, description, category, priority } = body;

        if (!title || !description) {
            return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
        }

        let customerId = user.id;
        let ownerId = user.ownerId;

        // If admin/staff is creating a ticket for a customer
        if (user.role !== 'customer') {
            if (!body.customerId) {
                return NextResponse.json({ error: 'customerId is required for staff' }, { status: 400 });
            }
            customerId = body.customerId;
        }

        // Fetch customer details to get their assigned agent, technician, and owner
        const customer = await db.customer.findUnique({
            where: { id: customerId },
            include: { owner: true }
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        ownerId = customer.ownerId;

        // Auto-routing logic based on Category
        let assignedStaffId = null;
        if (category === 'teknis') {
            assignedStaffId = customer.technicianId; // Assign to their technician
        } else if (category === 'tagihan') {
            assignedStaffId = customer.agentId; // Assign to their agent
        }

        // Generate sequential ticket ID: TKT-YYYYMMDD-XXXX
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await db.ticket.count({
            where: {
                ticketId: {
                    startsWith: `TKT-${dateStr}`
                }
            }
        });
        const sequence = String(count + 1).padStart(4, '0');
        const ticketId = `TKT-${dateStr}-${sequence}`;

        // Create the Ticket
        const ticket = await db.ticket.create({
            data: {
                ticketId,
                title,
                description,
                category: category || 'umum',
                priority: priority || 'medium',
                status: 'open',
                customerId,
                technicianId: assignedStaffId,
                ownerId
            },
            include: {
                customer: true
            }
        });

        // Trigger Notification
        // 1. Notify Assigned Staff (if any)
        if (assignedStaffId) {
            const notification = await db.notification.create({
                data: {
                    type: 'ticket_new',
                    title: `Tiket Baru: ${ticket.ticketId}`,
                    message: `Tiket baru dari ${customer.name} tentang ${title}`,
                    ticketId: ticket.id,
                    ownerId
                }
            });

            await db.notificationRecipient.create({
                data: {
                    notificationId: notification.id,
                    userId: assignedStaffId
                }
            });
        }

        // 2. Notify Owner/Admin
        if (ownerId) {
            const adminNotification = await db.notification.create({
                data: {
                    type: 'ticket_new',
                    title: `Tiket Baru Masuk: ${ticket.ticketId}`,
                    message: `Pelanggan ${customer.name} membuat tiket baru.`,
                    ticketId: ticket.id,
                    ownerId
                }
            });

            // Find all active admins for this owner
            const admins = await db.user.findMany({
                where: {
                    OR: [
                        { id: ownerId },
                        { ownerId: ownerId, role: 'admin' }
                    ]
                }
            });

            for (const admin of admins) {
                // Don't notify the assigned staff twice
                if (admin.id !== assignedStaffId) {
                    await db.notificationRecipient.create({
                        data: {
                            notificationId: adminNotification.id,
                            userId: admin.id
                        }
                    });
                }
            }
        }

        return NextResponse.json(ticket);
    } catch (error) {
        console.error('[POST /api/tickets] Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create ticket' }, { status: 500 });
    }
}
