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

        // IF CUSTOMER: Resolve their actual PPPoE username from DB (token stores CustomerID)
        if (user.role === 'customer') {
            // Look up the customer to get their PPPoE username
            const customer = await db.customer.findFirst({
                where: {
                    OR: [
                        { customerId: user.username },
                        { username: user.username }
                    ]
                }
            });

            if (!customer) {
                return NextResponse.json([]);
            }

            const pppoeUsername = customer.username;
            const regex = { $regex: pppoeUsername, $options: 'i' };
            query = {
                $or: [
                    { "VirtualParameters.pppoeUsername": regex },
                    { "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username": regex },
                    { "Device.PPP.Interface.1.Username": regex }
                ]
            };

            const devices = await findDevices(query);
            const cleanedDevices = devices.map(parseGenieACSDevice);

            const myDevice = cleanedDevices.find(d =>
                d.pppoe_user &&
                d.pppoe_user.toLowerCase() === pppoeUsername.toLowerCase()
            );

            return NextResponse.json(myDevice ? [myDevice] : []);
        }

        if (search) {
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

        // SUPERADMIN / ADMIN: Global View
        if (user.role === 'superadmin' || user.role === 'admin') {
            return NextResponse.json(cleanedDevices);
        }

        // STAFF / MANAGER: OwnerId Filtering
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
