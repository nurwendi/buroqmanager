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
            // Helper to safely get value
            const getVal = (path) => {
                const parts = path.split('.');
                let current = d;
                for (const part of parts) {
                    current = current?.[part];
                }
                return current?._value || current || null;
            };

            // 1. Serial Number Strategies
            const serial = d.DeviceID?.SerialNumber ||
                getVal('InternetGatewayDevice.DeviceInfo.SerialNumber') ||
                getVal('Device.DeviceInfo.SerialNumber') ||
                d._deviceId?._SerialNumber || '-';

            // 2. Model / Product Class Strategies
            const model = d.DeviceID?.ProductClass ||
                getVal('InternetGatewayDevice.DeviceInfo.ProductClass') ||
                getVal('Device.DeviceInfo.ProductClass') || '-';

            // 3. Manufacturer Strategies
            const manufacturer = d.DeviceID?.Manufacturer ||
                getVal('InternetGatewayDevice.DeviceInfo.Manufacturer') ||
                getVal('Device.DeviceInfo.Manufacturer') || '-';

            // 4. IP Address Strategies
            const ip = getVal('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress') ||
                getVal('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress') ||
                getVal('Device.IP.Interface.1.IPv4Address.1.IPAddress') ||
                'N/A';

            // 5. PPPoE Username Strategies
            const pppoeUser = getVal('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username') ||
                getVal('Device.PPP.Interface.1.Username') ||
                '-';

            return {
                id: d._id,
                serial: serial,
                model: model,
                manufacturer: manufacturer,
                lastInform: d._lastInform,
                ip: ip,
                pppoe_user: pppoeUser
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
