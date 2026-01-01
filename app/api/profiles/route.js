
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/api-auth';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);

        // Show Global Profiles (created by Superadmin) AND specific owner profiles (if any legacy exists)
        // If system is single-DB with multiple tenants, usually Superadmin creates plans for everyone.
        // Let's assume Profile should be Global.

        let where = {};
        // If we want to allow tenants to see ONLY global profiles + their own (if we allowed that before)
        // For now, let's just return ALL profiles if user is authorized, or filter if needed.
        // User request: "Tampilkan seluruhnya di tenant/admin".

        // If user is just a customer, maybe restrict? But for staff/admin:

        const profiles = await db.profile.findMany({
            orderBy: { price: 'asc' }
        });

        return NextResponse.json(profiles);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);

        // STRICT: Only Superadmin can create/manage profiles
        if (!user || user.role !== 'superadmin') {
            return NextResponse.json({ error: 'Unauthorized: Only Superadmin can manage profiles' }, { status: 403 });
        }

        const body = await request.json();
        const { name, price, speedUp, speedDown, description } = body;

        // 1. Create Profile in App DB (Global, ownerId null or superadmin)
        const profile = await db.profile.create({
            data: {
                name,
                price: parseFloat(price),
                speedUp: parseInt(speedUp),
                speedDown: parseInt(speedDown),
                description,
                ownerId: null // Global Profile
            }
        });

        // 2. Sync to Radius Group (RadGroupReply)
        // Attribute: Mikrotik-Rate-Limit
        // Format: rx-rate[/tx-rate] [rx-burst-rate[/tx-burst-rate] [rx-burst-threshold[/tx-burst-threshold] [rx-burst-time[/tx-burst-time] [priority] [rx-rate-min[/tx-rate-min]]]]]
        // Simple format: Upload/Download (e.g. 1024k/5120k)

        // Convert integer (Kbps) to string with 'k' or 'M'
        // For simplicity, let's just use raw bits or 'k'. Mikrotik accepts 'k'.

        const rateLimitValue = `${speedUp}k/${speedDown}k`;

        await db.radGroupReply.create({
            data: {
                groupname: name, // Use profile name as Group Name
                attribute: 'Mikrotik-Rate-Limit',
                op: '=',
                value: rateLimitValue
            }
        });

        // Also add standard Session-Timeout or Idle-Timeout if needed?
        // keeping it simple for now.

        return NextResponse.json({ success: true, profile });
    } catch (error) {
        console.error("Profile Create Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || user.role !== 'superadmin') {
            return NextResponse.json({ error: 'Unauthorized: Only Superadmin can manage profiles' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const profile = await db.profile.findUnique({ where: { id } });
        if (profile) {
            // Cleanup Radius Groups (all replies and checks)
            await db.radGroupReply.deleteMany({ where: { groupname: profile.name } });
            await db.radGroupCheck.deleteMany({ where: { groupname: profile.name } });

            await db.profile.delete({ where: { id } });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
