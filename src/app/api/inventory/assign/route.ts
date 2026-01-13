
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateInventoryItem, getInventoryItems } from '@/lib/inventory-service';
import { updateLead, getLeads, logAction } from '@/lib/leads';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { inventoryId, customerId } = body;

        if (!inventoryId || !customerId) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        // 1. Fetch Item to get details
        const items = await getInventoryItems(); // Optimize: get single item if possible, but reading all is okay for now
        const item = items.find(i => i.id === inventoryId);

        if (!item) {
            return NextResponse.json({ message: 'Item not found' }, { status: 404 });
        }

        if (item.durum !== 'STOKTA') {
            return NextResponse.json({ message: 'Item is not in stock' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // 2. Update Inventory Item -> SOLDOUT
        await updateInventoryItem(inventoryId, {
            durum: 'SATILDI',
            cikis_tarihi: now,
            musteri_id: customerId
        });

        // 3. Update Customer -> Set IMEI/Serial

        // Leads service returns all leads, fine for this op.
        const leads = await getLeads();
        const customer = leads.find(c => c.id === customerId);

        if (customer) {
            // Parse existing items
            let soldItems: any[] = [];
            try {
                if (customer.satilan_urunler) {
                    soldItems = JSON.parse(customer.satilan_urunler);
                }
            } catch (e) {
                console.warn('Failed to parse existing sold items:', e);
            }

            // Create new item entry
            const newItem = {
                imei: item.imei || '',
                seri_no: item.seri_no || '',
                marka: item.marka,
                model: item.model,
                satis_tarihi: now,
                fiyat: 0
            };

            // Add to list
            soldItems.push(newItem);

            await updateLead({
                ...customer,
                // KEEP Legacy fields for backward compatibility (shows last item)
                urun_imei: (item.imei || '') as string,
                urun_seri_no: (item.seri_no || '') as string,
                // NEW: JSON Field
                satilan_urunler: JSON.stringify(soldItems),

                durum: 'Teslim edildi',
                teslim_tarihi: now,
                teslim_eden: session.user.email || undefined
            }, session.user.email || 'System');

            // Log it
            await logAction({
                log_id: crypto.randomUUID(),
                timestamp: now,
                user_email: session.user.email || 'System',
                customer_id: customerId,
                action: 'UPDATE_FIELDS',
                note: `Stock Item Assigned (Multi): ${item.marka} ${item.model} (IMEI: ${item.imei})`
            });
        }

        return NextResponse.json({ success: true, item });
    } catch (error) {
        console.error('Assign error:', error);
        return NextResponse.json({ message: 'Assignment failed' }, { status: 500 });
    }
}
