import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status, amount, notes } = body;

        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        const currentPayment = await db.payment.findUnique({
            where: { id: id },
            include: { commissions: true }
        });

        if (!currentPayment) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        const updatedPayment = await db.payment.update({
            where: { id: id },
            data: {
                status: status,
                date: status === 'completed' ? new Date() : currentPayment.date,
                amount: amount !== undefined ? parseFloat(amount) : currentPayment.amount,
                notes: notes !== undefined ? notes : currentPayment.notes
            },
            include: { commissions: true }
        });

        // If postponed, create invoice for next month
        if (status === 'postponed') {
            const currentMonth = currentPayment.month;
            const currentYear = currentPayment.year;

            // Calculate next month
            let nextMonth = currentMonth + 1;
            let nextYear = currentYear;

            if (nextMonth > 11) {
                nextMonth = 0;
                nextYear++;
            }

            // Check if next month invoice already exists for this user
            const exists = await db.payment.findFirst({
                where: {
                    username: currentPayment.username,
                    month: nextMonth,
                    year: nextYear
                }
            });

            if (!exists) {
                // Generate Invoice Number
                const yy = String(nextYear).slice(-2);
                const mm = String(nextMonth + 1).padStart(2, '0');

                const customer = await db.customer.findFirst({
                    where: { username: currentPayment.username }
                });
                const custId = (customer?.customerId || 'CUST').replace(/\s+/g, '-');

                // Get sequence
                const count = await db.payment.count({
                    where: { year: nextYear }
                });
                const seq = String(count + 1).padStart(6, '0');

                const newInvoiceNumber = `INV/${yy}/${mm}/${custId}/${seq}`;

                // Ensure unique invoice number just in case
                // If it conflicts, Prisma throws. We might need retry logic or better generation.
                // For now, accept risk or use timestamp component.

                await db.payment.create({
                    data: {
                        date: new Date(),
                        status: 'pending',
                        invoiceNumber: newInvoiceNumber,
                        username: currentPayment.username,
                        amount: currentPayment.amount, // Carry over amount
                        month: nextMonth,
                        year: nextYear,
                        notes: `Tagihan bulan ${nextMonth + 1}/${nextYear} (Auto-generated from postponement)`
                    }
                });
            }
        }

        return NextResponse.json({ success: true, payment: updatedPayment });
    } catch (error) {
        console.error('Update Error:', error);
        return NextResponse.json({ error: 'Failed to update payment: ' + error.message }, { status: 500 });
    }
}
