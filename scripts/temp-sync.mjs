import { syncUsersFromRouter } from '../lib/sync-users.js';
import db from '../lib/db.js';

async function run() {
    try {
        const admin = await db.user.findFirst({ where: { role: 'superadmin' } });
        if (!admin) {
            console.error('No superadmin found');
            process.exit(1);
        }
        console.log('Syncing for admin:', admin.username);
        const res = await syncUsersFromRouter(admin.id);
        console.log('Sync Result:', JSON.stringify(res, null, 2));
        process.exit(0);
    } catch (e) {
        console.error('Sync Error:', e);
        process.exit(1);
    }
}

run();
