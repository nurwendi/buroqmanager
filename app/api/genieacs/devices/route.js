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
            // Regex search on Serial Number, PPPoE Username, or SSID
            // Note: GenieACS uses MongoDB syntax for queries
            const regex = { $regex: search, $options: 'i' };
            query = {
                $or: [
                    { "DeviceID.SerialNumber": regex },
                    { "_deviceId._SerialNumber": regex },
                    { "VirtualParameters.pppoeUsername": regex }, // Key path for users
                    { "InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username": regex },
                    { "InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID": regex },
                    { "_deviceId._OUI": regex }
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
                d._deviceId?._ProductClass ||
                d._ProductClass || // Check root level
                getVal('InternetGatewayDevice.DeviceInfo.ModelName') ||
                getVal('InternetGatewayDevice.DeviceInfo.ProductClass') ||
                getVal('Device.DeviceInfo.ProductClass') || '-';

            // 3. Manufacturer Strategies
            // Prioritize full names over OUI/Short codes
            const manufacturer = d._Manufacturer ||
                d._deviceId?._Manufacturer ||
                getVal('InternetGatewayDevice.DeviceInfo.Manufacturer') ||
                getVal('Device.DeviceInfo.Manufacturer') ||
                d.DeviceID?.Manufacturer ||
                d._deviceId?._OUI ||
                getVal('InternetGatewayDevice.DeviceInfo.ManufacturerOUI') ||
                '-';

            // 4. IP Address Strategies (Loop through typical indices)
            let ip = 'N/A';
            let pppoeUser = '-';

            // Check TR-098 WANDevice indices (common for VLANs)
            const wanIndices = ['1', '2', '3', '4', '5'];
            for (const i of wanIndices) {
                // Try PPP
                const pIp = getVal(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${i}.WANPPPConnection.1.ExternalIPAddress`);
                if (pIp && pIp !== '0.0.0.0' && pIp !== '-') {
                    ip = pIp;
                    pppoeUser = getVal(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${i}.WANPPPConnection.1.Username`) || pppoeUser;
                    break;
                }
                // Try IP
                const iIp = getVal(`InternetGatewayDevice.WANDevice.1.WANConnectionDevice.${i}.WANIPConnection.1.ExternalIPAddress`);
                if (iIp && iIp !== '0.0.0.0' && iIp !== '-') {
                    ip = iIp;
                    break;
                }
            }

            // Fallbacks if loop fail
            if (ip === 'N/A') {
                ip = getVal('Device.IP.Interface.1.IPv4Address.1.IPAddress') ||
                    getVal('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress') || // aggressive fallback
                    'N/A';
            }

            // 5. PPPoE Username Strategies (fallback)
            if (pppoeUser === '-') {
                pppoeUser = getVal('VirtualParameters.pppoeUsername') ||
                    getVal('Device.PPP.Interface.1.Username') ||
                    '-';
            }

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
        // Allow ONLY superadmin to see all devices for global management.
        // Admin, Manager, etc. must be restricted to their own customers.
        if (user.role === 'superadmin') {
            console.log(`[GenieACS] Found ${cleanedDevices.length} devices (Bypassed for superadmin)`);
            return NextResponse.json(cleanedDevices);
        }

        // For Staff/Managers: Only show devices where pppoe_user matches one of their Customers
        const ownerId = user.ownerId; // Staff/Manager should have ownerId
        console.log(`[GenieACS] User Role: ${user.role}, OwnerId: ${ownerId}`);

        if (!ownerId) {
            console.warn('[GenieACS] No ownerId found for user. Access denied.');
            return NextResponse.json([]);
        }

        // Extract all usernames from devices to bulk query DB
        const deviceUsernames = cleanedDevices
            .map(d => d.pppoe_user)
            .filter(u => u && u !== '-');

        if (deviceUsernames.length === 0) {
            console.log('[GenieACS] No valid PPPoE usernames found in devices.');
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
        console.log(`[GenieACS] Filtering: ${cleanedDevices.length} devices -> Found ${myCustomers.length} matching customers.`);

        // Filter the list
        const filteredDevices = cleanedDevices.filter(d => myUsernames.has(d.pppoe_user));
        console.log(`[GenieACS] Returning ${filteredDevices.length} devices.`);

        return NextResponse.json(filteredDevices);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
