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
        if (!body.marka || !body.model) {
            return NextResponse.json({ message: 'Missing required fields (Marka, Model)' }, { status: 400 });
        }

        // Conditional Validation based on Category
        const isAccessory = body.kategori === 'Aksesuar';

        if (!isAccessory && !body.imei) {
            return NextResponse.json({ message: 'Missing required fields (IMEI needed for Devices)' }, { status: 400 });
        }


        // Duplicate Check (Only for Devices with IMEI)
        if (!isAccessory && body.imei) {
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
        }

        // Sanitize Payload
        // 1. Remove empty strings for numeric/optional fields (prevents "invalid input syntax for type numeric")
        // 2. Ensure Accessory fields are handled correctly
        // const isAccessory = body.kategori === 'Aksesuar'; // Already defined above

        const payload: any = {
            ...body,
            durum: 'STOKTA', // Defaults to In Stock
            kategori: body.kategori || 'Cihaz',
            stok_adedi: body.stok_adedi ? Number(body.stok_adedi) : 1,
            giris_tarihi: new Date().toISOString(),
            ekleyen: session.user.email,
            // Ensure numbers are numbers, empty strings are null
            fiyat_3_taksit: body.fiyat_3_taksit ? Number(body.fiyat_3_taksit) : null,
            fiyat_6_taksit: body.fiyat_6_taksit ? Number(body.fiyat_6_taksit) : null,
            fiyat_12_taksit: body.fiyat_12_taksit ? Number(body.fiyat_12_taksit) : null,
            fiyat_15_taksit: body.fiyat_15_taksit ? Number(body.fiyat_15_taksit) : null,
            alis_fiyati: body.alis_fiyati ? Number(body.alis_fiyati) : null,
            satis_fiyati: body.satis_fiyati ? Number(body.satis_fiyati) : null,
        };

        if (isAccessory) {
            payload.imei = null;
            payload.seri_no = null;
        } else {
            // For devices, allow imei/seri_no as is, but maybe trim?
            if (!payload.imei) payload.imei = null;
            if (!payload.seri_no) payload.seri_no = null;
        }

        const newItem = await addInventoryItem(payload);

        return NextResponse.json({ item: newItem });
    } catch (error: any) {
        console.error('Inventory Add Error:', error);
        // Better error logging for Supabase errors
        if (error.code) {
            console.error('Supabase Error Code:', error.code);
            console.error('Supabase Error Details:', error.details);
            console.error('Supabase Error Hint:', error.hint);
            console.error('Supabase Error Message:', error.message);
        }
        return NextResponse.json({
            message: 'Failed to add item',
            details: error.message || error,
            hint: error.hint || 'Check if you ran the DB migration properly.',
            code: error.code
        }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);

    // Only ADMIN can delete inventory
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Unauthorized - Admin only' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ message: 'Missing item ID' }, { status: 400 });
        }

        const { supabaseAdmin } = await import('@/lib/supabase');

        // 1. Get the item to check if it's linked to a customer
        const { data: item, error: fetchError } = await supabaseAdmin
            .from('inventory')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !item) {
            return NextResponse.json({ message: 'Item not found' }, { status: 404 });
        }

        // 2. If item is sold and linked to a customer, unlink it from customer record
        if (item.durum === 'SATILDI' && item.customer_id) {
            // Clear the customer's product fields
            const { error: updateCustomerError } = await supabaseAdmin
                .from('leads')
                .update({
                    urun_imei: null,
                    urun_seri_no: null,
                    marka: null,
                    model: null
                })
                .eq('id', item.customer_id);

            if (updateCustomerError) {
                console.error('Error unlinking customer:', updateCustomerError);
                // Continue anyway - we still want to delete the inventory
            }
        }

        // 3. Delete the inventory item
        const { error: deleteError } = await supabaseAdmin
            .from('inventory')
            .delete()
            .eq('id', id);

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({
            success: true,
            message: 'Inventory item deleted successfully',
            unlinked_customer: item.customer_id || null
        });

    } catch (error: any) {
        console.error('Inventory Delete Error:', error);
        return NextResponse.json({
            message: 'Failed to delete item',
            details: error.message || error
        }, { status: 500 });
    }
}
