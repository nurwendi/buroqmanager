import { NextResponse } from 'next/server';
import { generateInvoices } from '@/lib/billing';
import { verifyToken } from '@/lib/security';
import { getConfig, getUserConnectionId } from '@/lib/config';

export async function POST(request) {
    try {
        const token = request.cookies.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const currentUser = await verifyToken(token);
        if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const config = await getConfig();
        let connectionId = getUserConnectionId(currentUser, config);

        // Fallback: If no connection ID for staff/user, try owner's connection
        if (!connectionId && currentUser.ownerId) {
            const ownerConn = config.connections?.find(c => c.ownerId === currentUser.ownerId);
            if (ownerConn) connectionId = ownerConn.id;
        }

        // SUPERADMIN FALLBACK: Default to first connection if none selected
        if (!connectionId && currentUser.role === 'superadmin' && config.connections?.length > 0) {
            connectionId = config.connections[0].id; // Default to first for Global Admin
        }

        // Determine Owner ID for filtering customers
        let targetOwnerId = null;
        if (currentUser.role === 'admin') {
            targetOwnerId = currentUser.id;
        } else if (currentUser.ownerId) {
            targetOwnerId = currentUser.ownerId;
        } else if (currentUser.role === 'superadmin') {
            // If superadmin is viewing a specific connection, use that connection's owner
            // If global view (no connection selected or default), maybe run for ALL?
            // Current generateInvoices handles ownerId=null as "All Customers".
            // But checking connectionId is safer.
            const activeConn = config.connections?.find(c => c.id === connectionId);
            if (activeConn && activeConn.ownerId) {
                targetOwnerId = activeConn.ownerId;
            }
        }

        // Prevent accidental global generation for non-superadmins
        if (!targetOwnerId && currentUser.role !== 'superadmin') {
            return NextResponse.json({ error: 'Could not determine owner scope for invoice generation.' }, { status: 400 });
        }

        const body = await request.json();
        const { month, year } = body;

        const result = await generateInvoices(month, year, connectionId, targetOwnerId);
        const monthName = new Date(result.year, result.month, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        return NextResponse.json({
            message: `Generated ${result.generated} invoices for ${monthName}. Skipped ${result.skipped} existing invoices.`,
            ...result
        });

    } catch (error) {
        console.error('Invoice generation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
