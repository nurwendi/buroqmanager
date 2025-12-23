import { getConfig, getUserConnectionId } from './lib/config.js';

// Need to mock DB for getConfig since it uses it
// Actually lib/config imports 'db' which imports '@prisma/client'.
// Node script should handle it if environment is right.

async function main() {
    console.log('Testing Router Resolution...');

    try {
        const config = await getConfig();
        console.log('Config loaded.');

        const ownerId = 'cmjhi72lw0003xx6cisnoe5yq'; // from previous check
        const mockUser = { role: 'agent', ownerId: ownerId };

        const connId = getUserConnectionId(mockUser, config);
        console.log(`Resolved Connection ID for Owner ${ownerId}: ${connId}`);

        const conn = config.connections.find(c => c.id === connId);
        if (conn) {
            console.log(`Connection Details: ${conn.name} (${conn.host})`);
        } else {
            console.log('Connection NOT found in config list.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

main();
