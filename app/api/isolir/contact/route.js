import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import db from '@/lib/db';

export async function GET(request) {
    try {
        // 1. Detect Client IP
        // In Next.js, we can try to get IP from headers if behind proxy, or socket
        const forwardedFor = request.headers.get('x-forwarded-for');
        let clientIp = forwardedFor ? forwardedFor.split(',')[0] : null;

        // If testing locally or failed to get IP, might need a fallback or manual test param
        const url_ip = request.nextUrl.searchParams.get('ip');
        if (url_ip) clientIp = url_ip;

        if (!clientIp) {
            // If strictly local dev without proxy, might be unreachable or 127.0.0.1
            // We can default to a specific IP for testing if needed, or return generic
            console.log("Could not detect IP, checking for 'editor' directly.");
        }

        let contactNumber = '';
        let contactName = 'Admin';
        let contactRole = 'Default';

        // 2. lookup active PPPoE active on Mikrotik to find username
        let pppoeUsername = null;

        if (clientIp) {
            try {
                const client = await getMikrotikClient();
                // Find active active where address is clientIp
                const activeConnections = await client.write('/ppp/active/print', [
                    '?address=' + clientIp
                ]);

                if (activeConnections && activeConnections.length > 0) {
                    pppoeUsername = activeConnections[0].name;
                }
            } catch (mtError) {
                console.error("Mikrotik lookup failed:", mtError);
                // Continue to fallback
            }
        }

        // 3. Logic to find contact
        if (pppoeUsername) {
            // Find customer in DB
            const customer = await db.customer.findUnique({
                where: { username: pppoeUsername },
                include: {
                    agent: true,
                    technician: true
                }
            });

            if (customer) {
                // Priority 1: Agent
                if (customer.agent && customer.agent.phone) {
                    contactNumber = customer.agent.phone;
                    contactName = customer.agent.fullName || customer.agent.username;
                    contactRole = 'Agen';
                }
                // Priority 2: Technician
                else if (customer.technician && customer.technician.phone) {
                    contactNumber = customer.technician.phone;
                    contactName = customer.technician.fullName || customer.technician.username;
                    contactRole = 'Teknisi';
                }
            }
        }

        // Priority 3: Editor (Fallback if no specific contact found yet)
        if (!contactNumber) {
            const editor = await db.user.findFirst({
                where: { role: 'editor' }
            });

            if (editor && editor.phone) {
                contactNumber = editor.phone;
                contactName = editor.fullName || editor.username;
                contactRole = 'Admin';
            } else {
                // If no editor, try admin
                const admin = await db.user.findFirst({
                    where: { role: 'admin' }
                });
                if (admin && admin.phone) {
                    contactNumber = admin.phone;
                    contactName = admin.fullName || admin.username;
                    contactRole = 'Admin';
                }
            }
        }

        // Final fallback (hardcoded or from settings if even DB fails)
        if (!contactNumber) {
            contactNumber = '628123456789'; // Default placeholder
        }

        return NextResponse.json({
            phone: formatPhoneNumber(contactNumber),
            name: contactName,
            role: contactRole,
            ip: clientIp,
            user: pppoeUsername
        });

    } catch (error) {
        console.error('Error in contact API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

function formatPhoneNumber(phone) {
    // Basic formatting to ensure Whatsapp link works (e.g. replace 08 with 628)
    let p = phone.replace(/\D/g, ''); // User digits only
    if (p.startsWith('0')) {
        p = '62' + p.substring(1);
    }
    return p;
}


