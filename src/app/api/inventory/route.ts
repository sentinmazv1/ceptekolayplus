import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getInventoryItems, addInventoryItem, updateInventoryItem } from '@/lib/inventory-service';
import { InventoryStatus } from '@/lib/types';

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { id, applyToAll, ...updates } = body;

        if (!id) {
            return NextResponse.json({ message: 'Missing item ID' }, { status: 400 });
        }

        // Bulk Update Logic
        if (applyToAll && updates.marka && updates.model) {
            // Fields to sync across same models
            const bulkUpdates = {
                fiyat_3_taksit: updates.fiyat_3_taksit,
                fiyat_6_taksit: updates.fiyat_6_taksit,
                fiyat_12_taksit: updates.fiyat_12_taksit,
                fiyat_15_taksit: updates.fiyat_15_taksit,
                alis_fiyati: updates.alis_fiyati
            };

            const { getInventoryItems } = await import('@/lib/inventory-service');
            const { supabaseAdmin } = await import('@/lib/supabase');

            // Update ALL items with same Brand/Model that are IN STOCK
            const { error: bulkError } = await supabaseAdmin
                .from('inventory')
                .update(bulkUpdates)
                .eq('marka', updates.marka)
                .eq('model', updates.model)
                .eq('durum', 'STOKTA');

            if (bulkError) throw bulkError;

            // Also update the specific item being edited (in case it wasn't caught or to ensure ID specific fields)
            const updatedItem = await updateInventoryItem(id, updates);
            return NextResponse.json({ item: updatedItem, message: "Bulk update successful" });
        }

        // Single Update
        const updatedItem = await updateInventoryItem(id, updates);
        return NextResponse.json({ item: updatedItem });
    } catch (error) {
        console.error('Inventory Update Error:', error);
        return NextResponse.json({ message: 'Failed to update item' }, { status: 500 });
    }
}

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
    } catch (error: any) {
        console.error('Inventory Add Error:', error);
        return NextResponse.json({ message: 'Failed to add item', details: error.message || error }, { status: 500 });
    }
}
