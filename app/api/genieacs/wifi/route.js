import { NextResponse } from 'next/server';
import { setParameter, getDevice } from '@/lib/genieacs';
import { getUserFromRequest } from '@/lib/api-auth';

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || (user.role !== 'superadmin' && user.role !== 'admin')) {
            // For safety, currently restricting to admins only
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { deviceId, ssid, password } = body;

        if (!deviceId || (!ssid && !password)) {
            return NextResponse.json({ error: 'Device ID and at least one value (SSID/Password) are required' }, { status: 400 });
        }

        // 1. Fetch device first to check type (TR-098 vs TR-181)
        const device = await getDevice(deviceId);

        // Determine correct paths based on what exists in the device data
        // We will push tasks to Update BOTH if unsure, or check explicitly
        const tasks = [];

        // TR-098 Paths (InternetGatewayDevice)
        if (device.InternetGatewayDevice) {
            // Usually Index 1 for main SSID
            if (ssid) {
                tasks.push(setParameter(deviceId, 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID', ssid));
                // Some devices differ, but this is standard. 
                // We might also need to check for other indexes if 5GHz
            }
            if (password) {
                // PreSharedKey or KeyPassphrase depending on encryption
                tasks.push(setParameter(deviceId, 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.PreSharedKey', password));
                tasks.push(setParameter(deviceId, 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase', password));
            }
        }

        // TR-181 Paths (Device)
        if (device.Device) {
            if (ssid) {
                tasks.push(setParameter(deviceId, 'Device.WiFi.SSID.1.SSID', ssid));
            }
            if (password) {
                tasks.push(setParameter(deviceId, 'Device.WiFi.AccessPoint.1.Security.KeyPassphrase', password));
            }
        }

        // Wait for all tasks to be queued
        await Promise.all(tasks);

        // Force a parameter refresh (optional but good)
        // await setParameter(deviceId, 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID', ssid); // Refresh

        return NextResponse.json({ success: true, message: 'Wi-Fi configuration tasks queued.' });

    } catch (error) {
        console.error("Set WiFi Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
