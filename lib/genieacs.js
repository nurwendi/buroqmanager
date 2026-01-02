
const GENIEACS_API_URL = process.env.GENIEACS_API_URL || 'http://localhost:7557';

/**
 * Helper to fetch data from GenieACS API
 */
async function acsRequest(path, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        // Authentication Support
        const username = process.env.GENIEACS_USERNAME;
        const password = process.env.GENIEACS_PASSWORD;

        if (username && password) {
            const encodedCoords = Buffer.from(`${username}:${password}`).toString('base64');
            options.headers['Authorization'] = `Basic ${encodedCoords}`;
        }

        const url = `${GENIEACS_API_URL}${path}`;
        // console.log(`[GenieACS] Fetching: ${url}`); // Debug Log

        const response = await fetch(url, options);

        if (!response.ok) {
            console.error(`[GenieACS] Error ${response.status}: ${response.statusText} for URL: ${url}`);
            throw new Error(`GenieACS Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`[GenieACS] Request Failed: ${error.message} (URL: ${GENIEACS_API_URL}${path})`);
        // Return empty array/object gracefully if connection fails?
        // Or rethrow to let API handle it? 
        // For findDevices, maybe return empty array if we can't connect?
        throw error;
    }
}

/**
 * Find devices by query (projection included for speed)
 * Query syntax: mongo/json style query string
 */
export async function findDevices(query = {}) {
    // Default projection removed to ensure we capture all data variants (TR-181 / TR-069)
    // const projection = { ... };

    // Construct query string
    const queryString = encodeURIComponent(JSON.stringify(query));
    // const projectionString = encodeURIComponent(JSON.stringify(projection));

    return await acsRequest(`/devices/?query=${queryString}`);
}

/**
 * Get full device details
 */
export async function getDevice(deviceId) {
    // Direct access via /devices/{id} fails (405) on some versions
    // So we search by _id instead
    const devices = await findDevices({ _id: deviceId });
    if (devices && devices.length > 0) {
        return devices[0];
    }
    throw new Error(`Device ${deviceId} not found`);
}

/**
 * Trigger a Reboot Task
 */
export async function rebootDevice(deviceId) {
    const task = {
        name: 'reboot'
    };
    // Updated based on test results: /devices/{ID}/tasks
    return await acsRequest(`/devices/${encodeURIComponent(deviceId)}/tasks`, 'POST', task);
}

/**
 * Set a parameter value on a device
 * @param {string} deviceId 
 * @param {string} parameterName 
 * @param {string|number} value 
 */
export async function setParameter(deviceId, parameterName, value) {
    const task = {
        name: 'setParameterValues',
        parameterValues: [
            [parameterName, value]
        ]
    };
    return await acsRequest(`/devices/${encodeURIComponent(deviceId)}/tasks`, 'POST', task);
}
/**
 * Parse raw GenieACS device data into a cleaner object
 * Extracts Serial, Model, Manufacturer, IP, PPPoE User, SSID, Signal, Temp
 */
export function parseGenieACSDevice(d) {
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
}
