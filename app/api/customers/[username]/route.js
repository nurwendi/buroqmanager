import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request, { params }) {
    try {
        const { username } = await params;

        // Since username is not unique globally, we use findFirst. 
        // ideally we should pass ownerId in query params, but for now this finds the first match.
        const customer = await db.customer.findFirst({
            where: { username: username }
        });

        if (!customer) {
            return NextResponse.json({
                name: '',
                address: '',
                phone: ''
            });
        }

        return NextResponse.json(customer);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const { username } = await params;
        const body = await request.json();
        const { name, address, phone } = body;

        // Note: This endpoint updates customer DETAILS. 
        // It does not seem to handle username changes (which would require changing the ID in Customer model).
        // The file-based one just updated the object at key `username`.

        // Use updateMany because username is not unique (though likely only 1 match usually)
        const updatedCustomer = await db.customer.updateMany({
            where: { username: username },
            data: {
                name: name || undefined,
                address: address || undefined,
                phone: phone || undefined
            }
        });

        // Also update User if name/phone matches?
        // Ideally yes to keep sync.
        await db.user.update({
            where: { username: username },
            data: {
                fullName: name || undefined,
                address: address || undefined,
                phone: phone || undefined
            }
        }).catch(() => { }); // Ignore if user not found or other error

        return NextResponse.json({ success: true, customer: updatedCustomer });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { username } = await params;

        // Delete Customer (Cascades? No, we didn't set cascade on User->Customer, but Customer is the child? 
        // Actually Customer and User are separate but linked by conventions.
        // We should delete both.)

        const deleteCustomer = db.customer.deleteMany({
            where: { username: username }
        });

        const deleteUser = db.user.deleteMany({
            where: { username: username }
        }); // This might fail if user doesn't exist, handle it.

        try {
            await db.$transaction([deleteCustomer, deleteUser]);
        } catch (e) {
            // If transaction fails (e.g. user not found), try deleting just customer
            await db.customer.delete({ where: { username: username } }).catch(() => { });
            await db.user.delete({ where: { username: username } }).catch(() => { });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
