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
            // Helper to safely get value and handle GenieACS object structure
            const getVal = (path) => {
                const parts = path.split('.');
                let current = d;
                for (const part of parts) {
                    current = current?.[part];
                }

                // If it's a GenieACS object node (has _value), extract it
                if (current && typeof current === 'object' && '_value' in current) {
                    return current._value;
                }

                // If it's still an object (and not null), it means we hit a branch node, not a leaf value.
                // We should NOT return the object, as React will crash.
                if (current && typeof current === 'object') {
                    return null;
                }

                return current || null;
            };

            // 1. Serial Number Strategies
            const serial = d.DeviceID?.SerialNumber ||
                getVal('InternetGatewayDevice.DeviceInfo.SerialNumber') ||
                getVal('InternetGatewayDevice.DeviceInfo.X_HW_SerialNumber') || // Huawei specific
                getVal('VirtualParameters.getSerialNumber') ||
                getVal('Device.DeviceInfo.SerialNumber') ||
                d._deviceId?._SerialNumber || '-';

            // 2. Model / Product Class Strategies
            const model = d.DeviceID?.ProductClass ||
                d._deviceId?._ProductClass || // GenieACS Standard
                getVal('InternetGatewayDevice.DeviceInfo.ModelName') ||
                getVal('InternetGatewayDevice.DeviceInfo.ProductClass') ||
                getVal('Device.DeviceInfo.ProductClass') || '-';

            // 3. Manufacturer Strategies
            const manufacturer = d.DeviceID?.Manufacturer ||
                d._deviceId?._OUI || // GenieACS uses OUI often
                d._deviceId?._Manufacturer ||
                getVal('InternetGatewayDevice.DeviceInfo.ManufacturerOUI') ||
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

            // 6. SSID Strategies
            const ssid = getVal('InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID') ||
                getVal('Device.WiFi.SSID.1.SSID') ||
                getVal('InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID') ||
                '-';

            // 7. Rx Optical Power Strategies (Vendor specific)
            // Values are often in dBm, sometimes needing conversion /100 or /1000 depending on vendor
            let rxPower = getVal('InternetGatewayDevice.WANDevice.1.X_HUAWEI_OpticalInterface.RXPower') ||
                getVal('InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower') || // Found in debug
                getVal('InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANCommonInterfaceConfig.OpticalInputPower') ||
                getVal('VirtualParameters.RXPower') ||
                getVal('Device.Optical.Interface.1.OpticalPower.RxPower') ||
                '-';

            // 8. Temperature Strategies
            const temp = getVal('InternetGatewayDevice.DeviceInfo.TemperatureStatus.Temperature') ||
                getVal('InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.TransceiverTemperature') || // Found in debug
                getVal('VirtualParameters.gettemp') ||
                getVal('Device.DeviceInfo.TemperatureStatus.Temperature') ||
                '-';

            return {
                id: d._id,
                serial: serial,
                model: model,
                manufacturer: manufacturer,
                lastInform: d._lastInform,
                ip: ip,
                pppoe_user: pppoeUser,
                ssid: ssid,
                rx_power: rxPower,
                temp: temp
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
