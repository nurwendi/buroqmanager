const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateExistingStaffIds() {
    const forceAll = process.argv.includes('--force');

    console.log('\n🚀 Buroq Staff / Manager / Editor ID Generator');
    console.log('===============================================');
    if (forceAll) {
        console.log('⚠️  Mode --force aktif: Menyeragamkan ulang seluruh ID staf ke format [OwnerID][3 digit].\n');
    }

    try {
        // 1. Konversi role 'viewer' lama (jika ada) menjadi 'staff'
        const viewerMigration = await prisma.user.updateMany({
            where: { role: 'viewer' },
            data: { role: 'staff' }
        });
        if (viewerMigration.count > 0) {
            console.log(`✅ Mengonversi ${viewerMigration.count} akun ber-role 'viewer' menjadi 'staff'.`);
        }

        // 2. Ambil seluruh user diurutkan berdasarkan waktu pembuatan
        const allUsers = await prisma.user.findMany({
            orderBy: { createdAt: 'asc' }
        });

        // 3. Pastikan semua Admin memiliki kode OwnerID 2 digit (01, 02, dst.)
        const admins = allUsers.filter(u => u.role === 'admin');
        let maxAdminNum = 1;
        for (const a of admins) {
            const n = parseInt(a.agentNumber, 10);
            if (!isNaN(n) && n >= maxAdminNum) {
                maxAdminNum = n + 1;
            }
        }

        for (const a of admins) {
            if (!a.agentNumber || a.agentNumber.trim() === '') {
                const newAdminId = String(maxAdminNum++).padStart(2, '0');
                await prisma.user.update({
                    where: { id: a.id },
                    data: { agentNumber: newAdminId }
                });
                a.agentNumber = newAdminId;
                console.log(`👑 Admin "${a.username}" diberikan Owner ID: ${newAdminId}`);
            } else {
                console.log(`👑 Admin "${a.username}" sudah memiliki Owner ID: ${a.agentNumber}`);
            }
        }

        // 4. Kelompokkan Manager, Editor, dan Staff (termasuk role legacy agent/technician/partner) berdasarkan ownerId
        const operationalRoles = ['manager', 'editor', 'staff', 'agent', 'technician', 'partner'];
        const staffUsers = allUsers.filter(u => operationalRoles.includes(u.role));

        if (staffUsers.length === 0) {
            console.log('\nℹ️  Belum ada akun Manager, Editor, atau Staff di database.');
            return;
        }

        const staffByOwner = new Map();
        for (const u of staffUsers) {
            const ownerKey = u.ownerId || '__DEFAULT_OWNER__';
            if (!staffByOwner.has(ownerKey)) {
                staffByOwner.set(ownerKey, []);
            }
            staffByOwner.get(ownerKey).push(u);
        }

        let updatedCount = 0;
        let skippedCount = 0;

        for (const [ownerKey, usersInTenant] of staffByOwner.entries()) {
            const ownerUser = allUsers.find(u => u.id === ownerKey);
            const ownerPrefix = (ownerUser?.agentNumber && ownerUser.agentNumber.trim() !== '')
                ? ownerUser.agentNumber.trim()
                : '01';

            console.log(`\n📂 Memproses Tenant: ${ownerUser ? `${ownerUser.username} (OwnerID: ${ownerPrefix})` : `Default (OwnerID: ${ownerPrefix})`}`);

            // Cari nomor urut tertinggi yang sudah sesuai format [OwnerID][3 digit]
            let maxSeq = 0;
            const validPattern = new RegExp(`^${ownerPrefix}\\d{3}$`);

            if (!forceAll) {
                for (const u of usersInTenant) {
                    const currentId = (u.agentNumber || '').trim();
                    if (validPattern.test(currentId)) {
                        const seq = parseInt(currentId.substring(ownerPrefix.length), 10);
                        if (!isNaN(seq) && seq > maxSeq) {
                            maxSeq = seq;
                        }
                    }
                }
            }

            for (const u of usersInTenant) {
                const currentId = (u.agentNumber || '').trim();
                const isAlreadyStandard = validPattern.test(currentId);

                if (isAlreadyStandard && !forceAll) {
                    console.log(`   ⏭️  [SKIP] ${u.username} (${u.role}) sudah memiliki ID standar: ${currentId}`);
                    skippedCount++;
                    continue;
                }

                maxSeq++;
                const newStaffId = `${ownerPrefix}${String(maxSeq).padStart(3, '0')}`;

                await prisma.user.update({
                    where: { id: u.id },
                    data: { agentNumber: newStaffId }
                });

                console.log(`   ✅ [GENERATED] ${u.username} (${u.role}) : "${currentId || '-'}" -> "${newStaffId}"`);
                updatedCount++;
            }
        }

        console.log('\n===============================================');
        console.log(`✨ Selesai! Berhasil membuat/memperbarui: ${updatedCount} ID Staf (${skippedCount} dilewati karena sudah sesuai).`);
        console.log('===============================================\n');
    } catch (error) {
        console.error('\n💥 Terjadi kesalahan saat generate ID Staf:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

generateExistingStaffIds();
