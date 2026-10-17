import fs from 'fs';
import path from 'path';
import { getMikrotikClient } from './mikrotik';
import { getConfig } from './config';

const BACKUP_DIR = path.join(process.cwd(), 'backups', 'mikrotik');
const MAX_LOCAL_BACKUPS = 20;

export async function createMikrotikBackup(connectionId = null) {
    console.log('Starting Mikrotik Configuration Backup...');
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        const config = getConfig();
        const connections = config.connections || [];
        const targets = connectionId
            ? connections.filter(c => c.id === connectionId)
            : (connections.length > 0 ? connections : [{ id: null, name: 'default' }]);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backedUpFiles = [];

        for (const conn of targets) {
            try {
                const client = await getMikrotikClient(conn.id);
                const safeName = (conn.name || conn.id || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
                const routerBackupName = `buroq-auto-${safeName}-${timestamp}`;

                await client.write('/system/backup/save', [`=name=${routerBackupName}`]);
                console.log(`Backup file created on router (${safeName}): ${routerBackupName}.backup`);

                const filename = `mikrotik-backup-${safeName}-${timestamp}.rsc`;
                const filepath = path.join(BACKUP_DIR, filename);
                fs.writeFileSync(
                    filepath,
                    `Backup created on Router (${safeName}): ${routerBackupName}.backup\nDate: ${new Date().toLocaleString()}`
                );
                backedUpFiles.push(routerBackupName);
            } catch (connErr) {
                console.error(`Mikrotik backup failed for router ${conn.name || conn.id}:`, connErr.message);
            }
        }

        // Auto-rotate local mikrotik backup log files (keep newest MAX_LOCAL_BACKUPS)
        try {
            const files = fs.readdirSync(BACKUP_DIR)
                .filter(f => f.endsWith('.rsc'))
                .map(f => {
                    const fullPath = path.join(BACKUP_DIR, f);
                    return { fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs };
                })
                .sort((a, b) => b.mtimeMs - a.mtimeMs);

            for (const oldFile of files.slice(MAX_LOCAL_BACKUPS)) {
                fs.unlinkSync(oldFile.fullPath);
            }
        } catch (pruneErr) {
            console.warn('Failed to prune old Mikrotik backup logs:', pruneErr.message);
        }

        console.log('Mikrotik backup process completed.');
        return { success: backedUpFiles.length > 0, filename: backedUpFiles.join(', ') };

    } catch (error) {
        console.error('Mikrotik backup failed:', error);
        return { success: false, error: error.message };
    }
}

