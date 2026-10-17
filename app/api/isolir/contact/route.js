import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { getConfig } from '@/lib/config';
import db from '@/lib/db';

export async function GET(request) {
    try {
        // 1. Detect Client IP
        const forwardedFor = request.headers.get('x-forwarded-for');
        let clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : null;

        const url_ip = request.nextUrl.searchParams.get('ip');
        if (url_ip) clientIp = url_ip.trim();

        if (!clientIp) {
            console.log("Could not detect IP, checking for 'editor' directly.");
        }

        let contactNumber = '';
        let contactName = 'Admin';
        let contactRole = 'Default';

        // 2. Lookup active PPPoE session by IP across in-memory cache, RADIUS radAcct, and all MikroTik routers
        let pppoeUsername = null;

        if (clientIp) {
            // Fast Path A: Check in-memory _routerCache across all routers
            if (globalThis._routerCache) {
                for (const cached of Object.values(globalThis._routerCache)) {
                    if (Array.isArray(cached?.active)) {
                        const match = cached.active.find(a => a.address === clientIp);
                        if (match?.name) {
                            pppoeUsername = match.name;
                            break;
                        }
                    }
                }
            }

            // Fast Path B: Check active RADIUS accounting session in PostgreSQL
            if (!pppoeUsername) {
                try {
                    const radSession = await db.radAcct.findFirst({
                        where: { framedipaddress: clientIp, acctstoptime: null },
                        orderBy: { acctstarttime: 'desc' },
                        select: { username: true }
                    });
                    if (radSession?.username) {
                        pppoeUsername = radSession.username;
                    }
                } catch (radErr) {
                    // Ignore RADIUS lookup errors and continue to MikroTik
                }
            }

            // Fallback Path C: Query all configured MikroTik routers in parallel
            if (!pppoeUsername) {
                try {
                    const config = getConfig();
                    const connections = config.connections || [];
                    const connIds = connections.length > 0 ? connections.map(c => c.id) : [undefined];

                    const results = await Promise.allSettled(
                        connIds.map(async (connId) => {
                            const client = await getMikrotikClient(connId);
                            const activeConnections = await client.write('/ppp/active/print', [
                                '?address=' + clientIp
                            ]);
                            return activeConnections?.[0]?.name || null;
                        })
                    );

                    for (const res of results) {
                        if (res.status === 'fulfilled' && res.value) {
                            pppoeUsername = res.value;
                            break;
                        }
                    }
                } catch (mtError) {
                    console.error("Mikrotik lookup failed:", mtError);
                }
            }
        }

        // 3. Logic to find contact (Scoped to Customer's Agent -> Technician -> Tenant Owner)
        if (pppoeUsername) {
            const customer = await db.customer.findFirst({
                where: { username: pppoeUsername },
                include: {
                    agent: { select: { phone: true, fullName: true, username: true } },
                    technician: { select: { phone: true, fullName: true, username: true } },
                    owner: { select: { phone: true, fullName: true, username: true } }
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
                // Priority 3: Customer's Tenant Owner (Admin)
                else if (customer.owner && customer.owner.phone) {
                    contactNumber = customer.owner.phone;
                    contactName = customer.owner.fullName || customer.owner.username;
                    contactRole = 'Admin';
                }
            }
        }

        // Priority 4: Global Editor / Admin (Fallback if no specific customer/tenant contact found)
        if (!contactNumber) {
            const editor = await db.user.findFirst({
                where: { role: 'editor' }
            });

            if (editor && editor.phone) {
                contactNumber = editor.phone;
                contactName = editor.fullName || editor.username;
                contactRole = 'Admin';
            } else {
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


