import { NextResponse } from 'next/server';
import { findDevices, parseGenieACSDevice } from '@/lib/genieacs';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        let query = {};

        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // IF CUSTOMER: Only allow searching match their specific username (for security)
        if (user.role === 'customer') {
            const regex = { $regex: user.username, $options: 'i' };
            query = {
                $or: [
                    { "VirtualParameters.pppoeUsername": regex },
                    { "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username": regex },
                    { "Device.PPP.Interface.1.Username": regex }
                ]
            };
        } else if (search) {
            const regex = { $regex: search, $options: 'i' };
            query = {
                $or: [
                    { "DeviceID.SerialNumber": regex },
                    { "_deviceId._SerialNumber": regex },
                    { "VirtualParameters.pppoeUsername": regex },
                    { "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username": regex },
                    { "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID": regex },
                    { "_deviceId._OUI": regex }
                ]
            };
        }

        const devices = await findDevices(query);
        const cleanedDevices = devices.map(parseGenieACSDevice);

        // --- MULTITENANCY & ROLE FILTERING ---

        // 1. CUSTOMER: Strict One-to-One Match
        if (user.role === 'customer') {
            // Only return device if the extracted PPPoE username EXACTLY matches their login username
            const myDevice = cleanedDevices.find(d => d.pppoe_user === user.username);

            return NextResponse.json(myDevice ? [myDevice] : []);
        }

        // 2. SUPERADMIN / ADMIN: Global View
        if (user.role === 'superadmin' || user.role === 'admin') {
            // console.log(`[GenieACS] Found ${cleanedDevices.length} devices (Bypassed for ${user.role})`);
            return NextResponse.json(cleanedDevices);
        }

        // 3. STAFF / MANAGER: OwnerId Filtering
        const ownerId = user.ownerId;
        if (!ownerId) {
            return NextResponse.json([]);
        }

        const deviceUsernames = cleanedDevices
            .map(d => d.pppoe_user)
            .filter(u => u && u !== '-');

        if (deviceUsernames.length === 0) return NextResponse.json([]);

        const myCustomers = await db.customer.findMany({
            where: {
                ownerId: ownerId,
                username: { in: deviceUsernames }
            },
            select: { username: true }
        });

        const myUsernames = new Set(myCustomers.map(c => c.username));
        const filteredDevices = cleanedDevices.filter(d => myUsernames.has(d.pppoe_user));

        return NextResponse.json(filteredDevices);

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
