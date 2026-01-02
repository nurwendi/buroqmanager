
const GENIEACS_URL = process.env.GENIEACS_API_URL || 'http://localhost:7557';

async function checkHealth() {
    console.log(`\n🔍 Checking GenieACS Health at: ${GENIEACS_URL}`);
    console.log('--------------------------------------------------');

    try {
        // 1. Connection Check
        const start = Date.now();
        const res = await fetch(`${GENIEACS_URL}/devices`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const latency = Date.now() - start;

        if (!res.ok) {
            console.error(`❌ Connection Failed! Status: ${res.status} ${res.statusText}`);
            console.error(await res.text());
            return;
        }

        console.log(`✅ Connection OK (${latency}ms)`);

        // 2. Data Parsing Check
        const devices = await res.json();
        console.log(`✅ JSON Parsing OK`);
        console.log(`📊 Total Devices Found: ${devices.length}`);

        if (devices.length === 0) {
            console.log('⚠️ No devices found. Check if CPEs are informing to GenieACS.');
            return;
        }

        // 3. Mapping Check (Using exact logic from API)
        console.log('\n🕵️  Verifying Data Mapping (First 3 devices):');

        devices.slice(0, 3).forEach((d, index) => {
            const mapped = mapDevice(d);
            console.log(`\n[Device #${index + 1}] ID: ${mapped.id}`);
            console.log(`   Detailed Info:`);
            console.log(`   - Model:      ${mapped.model} ${mapped.model === '-' ? '❌ (Missing)' : '✅'}`);
            console.log(`   - Serial:     ${mapped.serial} ${mapped.serial === '-' ? '❌ (Missing)' : '✅'}`);
            console.log(`   - IP Addr:    ${mapped.ip} ${mapped.ip === 'N/A' ? '❌ (Missing)' : '✅'}`);
            console.log(`   - PPPoE User: ${mapped.pppoe_user} ${mapped.pppoe_user === '-' ? '❌ (Missing)' : '✅'}`);

            // Debug if missing
            if (mapped.pppoe_user === '-') {
                console.log('   ⚠️  Debug Info for Missing Username:');
                console.log('      - InternetGatewayDevice.WANDevice...Username:', getVal(d, 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username'));
                console.log('      - Device.PPP.Interface.1.Username:', getVal(d, 'Device.PPP.Interface.1.Username'));
            }
        });

        console.log('\n--------------------------------------------------');
        console.log('✅ Health Check Complete');

    } catch (err) {
        console.error('❌ CRITICAL ERROR:', err.message);
        if (err.cause) console.error(err.cause);
    }
}

// Helper to safely get value and handle GenieACS object structure
// (COPIED EXACTLY FROM FIXED API)
const getVal = (d, path) => {
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
    if (current && typeof current === 'object') {
        return null;
    }

    return current || null;
};

// Map logic
function mapDevice(d) {
    // 1. Serial Number Strategies
    const serial = d.DeviceID?.SerialNumber ||
        getVal(d, 'InternetGatewayDevice.DeviceInfo.SerialNumber') ||
        getVal(d, 'Device.DeviceInfo.SerialNumber') ||
        d._deviceId?._SerialNumber || '-';

    // 2. Model / Product Class Strategies
    const model = d.DeviceID?.ProductClass ||
        getVal(d, 'InternetGatewayDevice.DeviceInfo.ProductClass') ||
        getVal(d, 'Device.DeviceInfo.ProductClass') || '-';

    // 3. Manufacturer Strategies
    const manufacturer = d.DeviceID?.Manufacturer ||
        getVal(d, 'InternetGatewayDevice.DeviceInfo.Manufacturer') ||
        getVal(d, 'Device.DeviceInfo.Manufacturer') || '-';

    // 4. IP Address Strategies
    const ip = getVal(d, 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress') ||
        getVal(d, 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress') ||
        getVal(d, 'Device.IP.Interface.1.IPv4Address.1.IPAddress') ||
        'N/A';

    // 5. PPPoE Username Strategies
    const pppoeUser = getVal(d, 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username') ||
        getVal(d, 'Device.PPP.Interface.1.Username') ||
        '-';

    // 6. SSID
    const ssid = getVal(d, 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID') ||
        getVal(d, 'Device.WiFi.SSID.1.SSID') ||
        '-';

    // 7. RX Power
    const rxPower = getVal(d, 'InternetGatewayDevice.WANDevice.1.X_HUAWEI_OpticalInterface.RXPower') ||
        getVal(d, 'InternetGatewayDevice.WANDevice.1.X_ZTE-COM_WANCommonInterfaceConfig.OpticalInputPower') ||
        getVal(d, 'Device.Optical.Interface.1.OpticalPower.RxPower') ||
        '-';

    // 8. Temp
    const temp = getVal(d, 'InternetGatewayDevice.DeviceInfo.TemperatureStatus.Temperature') ||
        getVal(d, 'Device.DeviceInfo.TemperatureStatus.Temperature') ||
        '-';

    return {
        id: d._id,
        serial: serial,
        model: model,
        manufacturer: manufacturer,
        ip: ip,
        pppoe_user: pppoeUser,
        ssid, rx_power: rxPower, temp
    };
}

checkHealth();
