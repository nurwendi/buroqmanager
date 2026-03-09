import fs from 'fs/promises';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const BACKUP_DIR = path.join(process.cwd(), 'backups');
// PostgreSQL Binaries - Use system PATH on Linux
const PG_DUMP_BIN = 'pg_dump';
const PSQL_BIN = 'psql';
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// Ensure backup directory exists
function ensureBackupDir() {
    if (!existsSync(BACKUP_DIR)) {
        mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

/**
 * Parse DATABASE_URL to get connection details
 */
function parseDatabaseUrl() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not defined');

    try {
        const parsedUrl = new URL(url);
        return {
            user: parsedUrl.username,
            password: decodeURIComponent(parsedUrl.password),
            host: parsedUrl.hostname,
            port: parsedUrl.port || '5432',
            database: parsedUrl.pathname.substring(1)
        };
    } catch (e) {
        // Fallback for complex strings that might fail URL parser
        const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
        if (!match) throw new Error('Invalid DATABASE_URL format');
        return {
            user: match[1],
            password: match[2],
            host: match[3],
            port: match[4],
            database: match[5]
        };
    }
}

/**
 * Dump PostgreSQL database to a file
 */
async function dumpPostgres(outputPath) {
    const config = parseDatabaseUrl();
    const env = { ...process.env, PGPASSWORD: config.password };

    return new Promise((resolve, reject) => {
        const dumpProcess = spawn(PG_DUMP_BIN, [
            '-h', config.host,
            '-p', config.port,
            '-U', config.user,
            '-F', 'p', // Plain SQL format
            '--clean', // Include DROP commands
            '--if-exists',
            '--no-owner',
            '--no-acl',
            '-f', outputPath,
            config.database
        ], { env });

        let errorOutput = '';
        dumpProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        dumpProcess.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`pg_dump exited with code ${code}: ${errorOutput}`));
        });

        dumpProcess.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Restore PostgreSQL database from a SQL file
 */
async function restorePostgres(sqlFilePath) {
    const config = parseDatabaseUrl();
    const env = { ...process.env, PGPASSWORD: config.password };

    return new Promise((resolve, reject) => {
        const restoreProcess = spawn(PSQL_BIN, [
            '-h', config.host,
            '-p', config.port,
            '-U', config.user,
            '-d', config.database,
            '-f', sqlFilePath
        ], { env });

        let errorOutput = '';
        restoreProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        restoreProcess.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`psql exited with code ${code}: ${errorOutput}`));
        });

        restoreProcess.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Create a backup of the database and public assets
 * @returns {Promise<{filename: string, path: string}>}
 */
export async function createBackup() {
    ensureBackupDir();

    // Dynamically require archiver to avoid build issues
    const archiver = require('archiver');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-complete-${timestamp}.zip`;
    const backupPath = path.join(BACKUP_DIR, filename);
    const tempSqlPath = path.join(BACKUP_DIR, `temp-${timestamp}.sql`);

    try {
        // 1. Generate SQL Dump
        await dumpPostgres(tempSqlPath);

        // 2. Create Zip Archive
        return new Promise((resolve, reject) => {
            const output = createWriteStream(backupPath);
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });

            output.on('close', async () => {
                // Clean up temp SQL file
                try {
                    await fs.unlink(tempSqlPath);
                } catch (e) {
                    console.warn('Failed to delete temp SQL file:', e);
                }

                resolve({
                    filename,
                    path: backupPath,
                    size: archive.pointer()
                });
            });

            archive.on('error', async (err) => {
                console.error('Archiver error:', err);
                // Clean up
                try {
                    if (existsSync(tempSqlPath)) await fs.unlink(tempSqlPath);
                } catch (e) { }
                reject(err);
            });

            archive.pipe(output);

            // Add SQL file to zip
            archive.file(tempSqlPath, { name: 'backup.sql' });

            // Add .env file (optional, but good for restoring config)
            const envPath = path.join(process.cwd(), '.env');
            if (existsSync(envPath)) {
                archive.file(envPath, { name: '.env.backup' });
            }

            // Add Public Assets
            // Logo
            const logoPath = path.join(PUBLIC_DIR, 'logo.png');
            if (existsSync(logoPath)) {
                archive.file(logoPath, { name: 'public/logo.png' });
            }

            // Favicon - Handle both .ico and .png
            const faviconIco = path.join(PUBLIC_DIR, 'favicon.ico');
            if (existsSync(faviconIco)) {
                archive.file(faviconIco, { name: 'public/favicon.ico' });
            } else {
                const faviconPng = path.join(PUBLIC_DIR, 'favicon.png');
                if (existsSync(faviconPng)) {
                    archive.file(faviconPng, { name: 'public/favicon.png' });
                }
            }

            // Uploads directory
            const uploadsDir = path.join(PUBLIC_DIR, 'uploads');
            if (existsSync(uploadsDir)) {
                archive.directory(uploadsDir, 'public/uploads');
            }

            // Core Server Configuration
            const packageJson = path.join(process.cwd(), 'package.json');
            if (existsSync(packageJson)) archive.file(packageJson, { name: 'package.json' });

            const pm2Config = path.join(process.cwd(), 'ecosystem.config.js');
            if (existsSync(pm2Config)) archive.file(pm2Config, { name: 'ecosystem.config.js' });

            // Database Schema folder (Prisma)
            const prismaDir = path.join(process.cwd(), 'prisma');
            if (existsSync(prismaDir)) {
                archive.directory(prismaDir, 'prisma');
            }
            // -------------------------------------

            archive.finalize();
        });
    } catch (error) {
        // Clean up temp file on error
        try {
            if (existsSync(tempSqlPath)) await fs.unlink(tempSqlPath);
        } catch (e) { }
        throw error;
    }
}

/**
 * List all available backups
 * @returns {Promise<Array<{filename: string, date: Date, size: number}>>}
 */
export async function listBackups() {
    ensureBackupDir();

    try {
        const files = await fs.readdir(BACKUP_DIR);
        const backups = [];

        for (const file of files) {
            if (file.endsWith('.zip')) {
                const filePath = path.join(BACKUP_DIR, file);
                try {
                    const stats = await fs.stat(filePath);
                    backups.push({
                        filename: file,
                        date: stats.mtime,
                        size: stats.size
                    });
                } catch (err) {
                    console.error(`Error reading stats for ${file}:`, err);
                }
            }
        }

        // Sort by date, newest first
        backups.sort((a, b) => b.date - a.date);

        return backups;
    } catch (error) {
        console.error('Error listing backups:', error);
        return [];
    }
}

/**
 * Restore from a backup file
 * @param {string} filename - The backup filename
 * @returns {Promise<void>}
 */
export async function restoreBackup(filename) {
    const backupPath = path.join(BACKUP_DIR, filename);

    if (!existsSync(backupPath)) {
        throw new Error('Backup file not found');
    }

    // Safety backup before restore
    try {
        console.log('Creating safety backup...');
        await createBackup();
    } catch (e) {
        console.warn('Failed to create safety backup:', e);
    }

    const AdmZip = require('adm-zip');
    const zip = new AdmZip(backupPath);
    const zipEntries = zip.getEntries();

    const timestamp = new Date().getTime();
    const tempExtractDir = path.join(BACKUP_DIR, `restore-temp-${timestamp}`);

    // Create temp dir
    if (!existsSync(tempExtractDir)) {
        mkdirSync(tempExtractDir, { recursive: true });
    }

    try {
        // Extract all files
        zip.extractAllTo(tempExtractDir, true);

        // 1. Restore Database
        const sqlFile = zipEntries.find(entry => entry.entryName.endsWith('.sql'));

        if (!sqlFile) {
            throw new Error('No SQL dump found in backup archive');
        }

        const sqlFilePath = path.join(tempExtractDir, sqlFile.entryName);

        console.log(`Restoring database from ${sqlFilePath}...`);
        await restorePostgres(sqlFilePath);
        console.log('Database restore completed successfully');

        // 2. Restore .env file
        const envEntry = zipEntries.find(entry => entry.entryName === '.env.backup');
        if (envEntry) {
            console.log('Restoring .env file...');
            const envContent = envEntry.getData().toString('utf8');
            const envPath = path.join(process.cwd(), '.env');
            await fs.writeFile(envPath, envContent);
            console.log('.env file restored.');
        }

        // 3. Restore Public Assets
        const publicDirInZip = path.join(tempExtractDir, 'public');
        const { cp } = require('fs/promises');
        
        if (existsSync(publicDirInZip)) {
            console.log('Restoring public assets...');
            // We need to move files from temp/public to PROJECT/public
            await cp(publicDirInZip, PUBLIC_DIR, { recursive: true, force: true });
            console.log('Public assets restored.');
        } else {
            console.log('No public assets found in backup to restore.');
        }

        // Core Server
            const pkgSrc = path.join(tempExtractDir, 'package.json');
        if (existsSync(pkgSrc)) await fs.cp(pkgSrc, path.join(process.cwd(), 'package.json'));

        const pm2Src = path.join(tempExtractDir, 'ecosystem.config.js');
        if (existsSync(pm2Src)) await fs.cp(pm2Src, path.join(process.cwd(), 'ecosystem.config.js'));

        // Prisma Schema
        const prismaSrc = path.join(tempExtractDir, 'prisma');
        if (existsSync(prismaSrc)) {
            await cp(prismaSrc, path.join(process.cwd(), 'prisma'), { recursive: true, force: true });
        }
        console.log('Extra configuration files restored.');

    } finally {
        // Cleanup temp dir
        try {
            await fs.rm(tempExtractDir, { recursive: true, force: true });
        } catch (e) {
            console.warn('Failed to cleanup temp restore files:', e);
        }
    }
}

/**
 * Delete a backup file
 * @param {string} filename - The backup filename
 * @returns {Promise<void>}
 */
export async function deleteBackup(filename) {
    const backupPath = path.join(BACKUP_DIR, filename);

    if (!existsSync(backupPath)) {
        throw new Error('Backup file not found');
    }

    await fs.unlink(backupPath);
}

/**
 * Get the path to a backup file
 * @param {string} filename - The backup filename
 * @returns {string}
 */
export function getBackupPath(filename) {
    // Prevent path traversal
    const safeFilename = path.basename(filename);
    if (safeFilename !== filename) {
        throw new Error('Invalid filename');
    }
    return path.join(BACKUP_DIR, safeFilename);
}
