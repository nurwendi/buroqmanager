import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { verifyToken } from '@/lib/security';
import { sendNotification } from '@/lib/notifications-db';

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            activationToken,
            name,
            email,
            phone,
            identityNumber,
            address,
            coordinates,
            comment,
            staffCode,
            newPassword
        } = body;

        if (!activationToken) {
            return NextResponse.json({ error: 'Token aktivasi tidak valid.' }, { status: 401 });
        }

        const payload = await verifyToken(activationToken);
        if (!payload || payload.purpose !== 'customer_activation' || !payload.customerId) {
            return NextResponse.json({ error: 'Sesi aktivasi telah berakhir. Silakan login kembali.' }, { status: 401 });
        }

        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Nama lengkap wajib diisi.' }, { status: 400 });
        }
        if (!email || !email.trim() || !email.includes('@')) {
            return NextResponse.json({ error: 'Alamat email yang valid wajib diisi.' }, { status: 400 });
        }
        if (!phone || !phone.trim()) {
            return NextResponse.json({ error: 'Nomor HP / WhatsApp wajib diisi.' }, { status: 400 });
        }
        if (!address || !address.trim()) {
            return NextResponse.json({ error: 'Alamat lengkap wajib diisi.' }, { status: 400 });
        }
        if (!staffCode || !staffCode.trim()) {
            return NextResponse.json({ error: 'ID Petugas (Sales / Teknisi) wajib diisi dan tidak boleh kosong.' }, { status: 400 });
        }
        if (!newPassword || newPassword.length < 4) {
            return NextResponse.json({ error: 'Password baru minimal 4 karakter.' }, { status: 400 });
        }
        if (newPassword.trim().toLowerCase() === 'buroq') {
            return NextResponse.json({ error: 'Password baru tidak boleh menggunakan password default "buroq".' }, { status: 400 });
        }

        const customer = await db.customer.findUnique({
            where: { id: payload.customerId }
        });

        if (!customer) {
            return NextResponse.json({ error: 'Data pelanggan tidak ditemukan.' }, { status: 404 });
        }

        // Validate staffCode against tenant's staff
        const cleanStaffCode = staffCode.trim();
        const staffUser = await db.user.findFirst({
            where: {
                ...(customer.ownerId ? { ownerId: customer.ownerId } : {}),
                OR: [
                    { agentNumber: { equals: cleanStaffCode, mode: 'insensitive' } },
                    { username: { equals: cleanStaffCode, mode: 'insensitive' } },
                    { id: cleanStaffCode }
                ]
            }
        });

        if (!staffUser) {
            return NextResponse.json({
                error: `ID Petugas (Sales / Teknisi) "${cleanStaffCode}" tidak ditemukan atau tidak valid. Pastikan ID petugas benar.`
            }, { status: 400 });
        }

        // Check if email is already used by another customer in the same tenant
        const cleanEmail = email.trim().toLowerCase();
        const emailExists = await db.customer.findFirst({
            where: {
                email: { equals: cleanEmail, mode: 'insensitive' },
                id: { not: customer.id }
            }
        });
        if (emailExists) {
            return NextResponse.json({ error: 'Email tersebut sudah digunakan oleh pelanggan lain.' }, { status: 400 });
        }

        // Check existing pending activation
        const existingPending = await db.registration.findFirst({
            where: {
                type: 'activation',
                targetUsername: customer.username,
                status: 'pending',
                ...(customer.ownerId ? { ownerId: customer.ownerId } : {})
            }
        });
        if (existingPending) {
            return NextResponse.json({
                error: 'Pengajuan aktivasi Anda sudah dikirim dan sedang menunggu konfirmasi Petugas.'
            }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        // Combined 1 staff for both Sales (agentId) and Technician (technicianId)
        const resolvedStaffId = staffUser.id;

        const activationValues = {
            customerId: customer.customerId,
            name: name.trim(),
            email: cleanEmail,
            phone: phone.trim(),
            identityNumber: identityNumber ? identityNumber.trim() : '',
            address: address.trim(),
            coordinates: coordinates ? coordinates.trim() : (customer.coordinates || ''),
            comment: comment !== undefined ? comment.trim() : (customer.comment || ''),
            agentId: resolvedStaffId,
            technicianId: resolvedStaffId,
            staffCode: staffUser.agentNumber || staffUser.username,
            customerPasswordHash: passwordHash
        };

        await db.registration.create({
            data: {
                type: 'activation',
                status: 'pending',
                username: `act_${Date.now()}_${customer.username}`,
                targetUsername: customer.username,
                name: name.trim(),
                address: address.trim(),
                phone: phone.trim(),
                identityNumber: identityNumber ? identityNumber.trim() : null,
                agentId: resolvedStaffId,
                technicianId: resolvedStaffId,
                coordinates: coordinates ? coordinates.trim() : null,
                comment: comment ? comment.trim() : null,
                ownerId: customer.ownerId,
                newValues: JSON.stringify(activationValues)
            }
        });

        // Notify assigned Staff (Sales/Technician) and Admin/Owner
        const recipientIds = new Set();
        recipientIds.add(resolvedStaffId);
        if (customer.ownerId) recipientIds.add(customer.ownerId);

        if (recipientIds.size > 0) {
            try {
                await sendNotification({
                    title: 'Konfirmasi Aktivasi Pelanggan',
                    message: `Pelanggan ${name.trim()} (${customer.customerId}) telah melengkapi identitas dengan ID Petugas [${staffUser.agentNumber || staffUser.username}] dan menunggu konfirmasi.`,
                    type: 'alert',
                    ownerId: customer.ownerId,
                    recipients: Array.from(recipientIds).map(uid => ({ userId: uid }))
                });
            } catch (notifErr) {
                console.error('[Activate] Failed to send notification:', notifErr.message);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Data identitas dan password baru berhasil dikirim ke Petugas ${staffUser.fullName || staffUser.username} (${staffUser.agentNumber || '-'}). Silakan tunggu konfirmasi.`
        });
    } catch (error) {
        console.error('[POST /api/auth/activate] Error:', error);
        return NextResponse.json({ error: error.message || 'Gagal mengirim pengajuan aktivasi.' }, { status: 500 });
    }
}
