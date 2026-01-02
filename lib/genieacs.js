
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
    // No projection, get everything (or specific params if too heavy)
    return await acsRequest(`/devices/${deviceId}`);
}

/**
 * Trigger a Reboot Task
 */
export async function rebootDevice(deviceId) {
    const task = {
        name: 'reboot',
        device: deviceId
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
        ],
        device: deviceId
    };
    return await acsRequest(`/devices/${encodeURIComponent(deviceId)}/tasks`, 'POST', task);
}
