import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateInventoryItem, getInventoryItems } from '@/lib/inventory-service';
import { updateLead, getLeads, logAction } from '@/lib/sheets';

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
        // We need to fetch current customer first to preserve other fields? 
        // updateLead merges? No, updateLead expects a full object usually or handling partials?
        // Checking sheets.ts: updateLead takes a Customer object and updates the row.
        // We should fetch the customer first.

        const leads = await getLeads();
        const customer = leads.find(c => c.id === customerId);

        if (customer) {
            await updateLead({
                ...customer,
                urun_imei: (item.imei || '') as string,
                urun_seri_no: (item.seri_no || '') as string,
                durum: 'Teslim edildi',
                teslim_tarihi: now,
                teslim_eden: session.user.email || undefined
            }, session.user.email || 'System');

            // Log it
            await logAction({
                log_id: crypto.randomUUID(),
                timestamp: now,
                user_email: session.user.email,
                customer_id: customerId,
                action: 'UPDATE_FIELDS', // Or custom action?
                note: `Stock Item Assigned: ${item.marka} ${item.model} (IMEI: ${item.imei})`
            });
        }

        return NextResponse.json({ success: true, item });
    } catch (error) {
        console.error('Assign error:', error);
        return NextResponse.json({ message: 'Assignment failed' }, { status: 500 });
    }
}
