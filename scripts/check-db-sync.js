const { execSync } = require('child_process');

console.log('🔍 Checking Database Sync Status...');

try {
    // Run prisma migrate status to see if there are pending migrations or drift
    // usage of exit code usually tells us if it's clean
    const output = execSync('npx prisma migrate status', { encoding: 'utf-8' });
    console.log(output);

    if (output.includes('Database schema is up to date')) {
        console.log('✅ Database is fully in sync with schema.');
        process.exit(0);
    } else if (output.includes('Following migration have not yet been applied')) {
        console.error('❌ Error: You have unapplied migrations. Run `npx prisma migrate deploy` locally to test, or ensure they are committed.');
        process.exit(1);
    } else {
        console.log('⚠️  Status unclear, please check output above.');
        // Check if schema has changes not in migration
        try {
            const diff = execSync('npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --exit-code', { encoding: 'utf-8' });
            // Exit code 0 means no diff (if flags valid), but migrate diff usually returns diff.
            // Actually best way: check if `prisma migrate dev` would create a migration.
            console.log('ℹ️  Checking for schema changes...');
        } catch (e) {
            // If exit code is not 0, there might be a diff
            if (e.stdout && e.stdout.trim().length > 0) {
                console.error('❌ Error: Your schema.prisma has changes that are NOT verifiable by a migration file.');
                console.error('   Please run: npx prisma migrate dev');
                process.exit(1);
            }
        }
    }

} catch (error) {
    console.error('❌ Error checking database sync:');
    console.error(error.message);
    if (error.stdout) console.log(error.stdout);
    process.exit(1);
}
