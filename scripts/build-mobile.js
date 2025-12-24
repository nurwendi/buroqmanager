const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiDir = path.join(__dirname, '../app/api');
const tempApiDir = path.join(__dirname, '../temp_api_backup');
const invoiceDir = path.join(__dirname, '../app/invoice');
const tempInvoiceDir = path.join(__dirname, '../temp_invoice_backup');
const layoutFile = path.join(__dirname, '../app/layout.js');

// Function to move/restore directories
function toggleDir(src, dest, move) {
    if (move) {
        if (fs.existsSync(src)) {
            console.log(`Disabling ${path.basename(src)} for mobile build...`);
            fs.renameSync(src, dest);
        }
    } else {
        if (fs.existsSync(dest)) {
            console.log(`Restoring ${path.basename(src)}...`);
            fs.renameSync(dest, src);
        }
    }
}

// Function to toggle layout dynamic config
function toggleLayout(staticMode) {
    if (!fs.existsSync(layoutFile)) return;
    let content = fs.readFileSync(layoutFile, 'utf8');

    if (staticMode) {
        if (content.includes("export const dynamic = 'force-dynamic';")) {
            console.log('Setting layout to force-static...');
            content = content.replace("export const dynamic = 'force-dynamic';", "export const dynamic = 'force-static';");
            fs.writeFileSync(layoutFile, content);
        }
    } else {
        if (content.includes("export const dynamic = 'force-static';")) {
            console.log('Restoring layout to force-dynamic...');
            content = content.replace("export const dynamic = 'force-static';", "export const dynamic = 'force-dynamic';");
            fs.writeFileSync(layoutFile, content);
        }
    }
}

try {
    // 1. Disable incompatible folders
    toggleDir(apiDir, tempApiDir, true);
    toggleDir(invoiceDir, tempInvoiceDir, true);

    // 2. Set Layout to Static
    toggleLayout(true);

    // 3. Run Build
    console.log('Running Next.js Build (Mobile)...');
    // Set env var for process
    process.env.BUILD_MODE = 'mobile';

    // Execute build command
    execSync('npx next build', { stdio: 'inherit', env: process.env });

    console.log('Mobile build successful!');
} catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
} finally {
    // 4. Restore everything
    toggleLayout(false);
    toggleDir(invoiceDir, tempInvoiceDir, false);
    toggleDir(apiDir, tempApiDir, false);
}
