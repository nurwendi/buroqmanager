import { NextResponse } from 'next/server';
import { findDevices } from '@/lib/genieacs';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');

        let query = {};
        if (search) {
            // Regex search on Serial Number or PPPoE Username
            // Note: GenieACS uses MongoDB syntax for queries
            query = {
                $or: [
                    { "DeviceID.SerialNumber": { $regex: search } },
                    { "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username": { $regex: search } }
                ]
            };
        }

        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const devices = await findDevices(query);

        // Map to cleaner structure
        const cleanedDevices = devices.map(d => {
            const wan = d.InternetGatewayDevice?.WANDevice?.['1']?.WANConnectionDevice?.['1'];
            const ip = wan?.WANIPConnection?.['1']?.ExternalIPAddress?._value ||
                wan?.WANPPPConnection?.['1']?.ExternalIPAddress?._value || 'N/A';
            const username = wan?.WANPPPConnection?.['1']?.Username?._value || '-';

            return {
                id: d._id,
                serial: d.DeviceID?.SerialNumber,
                model: d.DeviceID?.ProductClass,
                manufacturer: d.DeviceID?.Manufacturer,
                lastInform: d._lastInform,
                ip: ip,
                pppoe_user: username
            };
        });

        // MULTITENANCY FILTERING
        // Allow superadmin and admin to see all devices (simplifies setup/debugging)
        if (user.role === 'superadmin' || user.role === 'admin') {
            // console.log(`[GenieACS] Found ${cleanedDevices.length} devices (Filter bypassed for ${user.role})`);
            return NextResponse.json(cleanedDevices);
        }

        // For Staff/Managers: Only show devices where pppoe_user matches one of their Customers
        const ownerId = user.ownerId; // Staff/Manager should have ownerId

        if (!ownerId) {
            // If no owner, safer to show nothing
            return NextResponse.json([]);
        }

        // Extract all usernames from devices to bulk query DB
        const deviceUsernames = cleanedDevices
            .map(d => d.pppoe_user)
            .filter(u => u && u !== '-');

        if (deviceUsernames.length === 0) {
            return NextResponse.json([]);
        }

        // Find which of these usernames belong to this Owner
        const myCustomers = await db.customer.findMany({
            where: {
                ownerId: ownerId,
                username: { in: deviceUsernames }
            },
            select: { username: true }
        });

        const myUsernames = new Set(myCustomers.map(c => c.username));

        // Filter the list
        const filteredDevices = cleanedDevices.filter(d => myUsernames.has(d.pppoe_user));

        return NextResponse.json(filteredDevices);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
