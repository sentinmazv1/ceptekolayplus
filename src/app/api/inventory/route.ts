import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getInventoryItems, addInventoryItem } from '@/lib/inventory-service';
import { InventoryStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as InventoryStatus | undefined;

    try {
        const items = await getInventoryItems(status);
        return NextResponse.json({ items });
    } catch (error) {
        return NextResponse.json({ message: 'Failed to fetch inventory' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await req.json();

        // Basic validation
        if (!body.marka || !body.model || !body.imei) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }


        // Duplicate Check
        const existingItems = await getInventoryItems();
        const duplicate = existingItems.find(i =>
            (i.imei && i.imei === body.imei) ||
            (i.seri_no && i.seri_no === body.seri_no && body.seri_no.length > 0)
        );

        if (duplicate) {
            return NextResponse.json({
                message: `Duplicate entry found. IMEI/Serial already exists (Marka: ${duplicate.marka}).`
            }, { status: 409 });
        }

        const newItem = await addInventoryItem({
            ...body,
            durum: 'STOKTA', // Defaults to In Stock
            giris_tarihi: new Date().toISOString(),
            ekleyen: session.user.email
        });

        return NextResponse.json({ item: newItem });
    } catch (error) {
        return NextResponse.json({ message: 'Failed to add item' }, { status: 500 });
    }
}
