import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return unauthorizedResponse();
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Password lama dan password baru wajib diisi' }, { status: 400 });
        }

        if (newPassword.length < 4) {
            return NextResponse.json({ error: 'Password baru minimal 4 karakter' }, { status: 400 });
        }

        if (user.role === 'customer') {
            const customer = await db.customer.findFirst({
                where: {
                    OR: [
                        ...(user.id ? [{ id: user.id }] : []),
                        { customerId: user.username },
                        { username: user.username }
                    ]
                }
            });

            if (!customer) {
                return NextResponse.json({ error: 'Akun pelanggan tidak ditemukan' }, { status: 404 });
            }

            let isValid = false;
            if (customer.password) {
                if (customer.password.startsWith('$2')) {
                    isValid = await bcrypt.compare(currentPassword, customer.password);
                } else {
                    isValid = currentPassword === customer.password;
                }
            }

            if (!isValid) {
                return NextResponse.json({ error: 'Password saat ini salah' }, { status: 400 });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.customer.update({
                where: { id: customer.id },
                data: { password: hashedPassword }
            });

            return NextResponse.json({ success: true, message: 'Password berhasil diubah' });
        }

        const dbUser = await db.user.findUnique({
            where: { id: user.id }
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
        }

        const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: 'Password saat ini salah' }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await db.user.update({
            where: { id: dbUser.id },
            data: { passwordHash }
        });

        return NextResponse.json({ success: true, message: 'Password berhasil diubah' });
    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json({ error: 'Gagal mengubah password' }, { status: 500 });
    }
}
