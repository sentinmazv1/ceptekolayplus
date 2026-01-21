
import { NextRequest, NextResponse } from 'next/server';
import { getLeads } from '@/lib/leads';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const dateFilter = searchParams.get('date'); // YYYY-MM-DD

        // Fetch leads directly using the Service Layer
        const leads = await getLeads({ durum: 'Teslim edildi' }); // Pre-filter if possible, or fetch all if leads() filters are limited

        // Filter for specific date
        let deliveredCustomers = leads;

        if (dateFilter) {
            deliveredCustomers = deliveredCustomers.filter(c => {
                let hasItemMatch = false;

                // 1. Check Sales History (Item Level)
                try {
                    if (c.satilan_urunler) {
                        const products = typeof c.satilan_urunler === 'string' ? JSON.parse(c.satilan_urunler) : c.satilan_urunler;
                        if (Array.isArray(products)) {
                            hasItemMatch = products.some((p: any) => {
                                const pDateRaw = p.satis_tarihi || c.teslim_tarihi; // Item date or Customer Delivery date
                                if (!pDateRaw) return false;
                                // Convert to YYYY-MM-DD
                                const pDateStr = new Date(pDateRaw).toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
                                return pDateStr === dateFilter;
                            });
                        }
                    }
                } catch (e) { }

                if (hasItemMatch) return true;

                // 2. Fallback: Check Customer Main Delivery Date (Legacy or if list parsing fails)
                const rawDate = c.teslim_tarihi || c.updated_at;
                if (!rawDate) return false;

                const d = new Date(rawDate);
                if (isNaN(d.getTime())) return false;

                const turkeyDate = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
                return turkeyDate === dateFilter;
            });
        }

        // Sort by delivery date (newest first)
        deliveredCustomers.sort((a, b) => {
            const dateA = new Date(a.teslim_tarihi || a.updated_at || 0).getTime();
            const dateB = new Date(b.teslim_tarihi || b.updated_at || 0).getTime();
            return dateB - dateA;
        });

        return NextResponse.json({
            success: true,
            count: deliveredCustomers.length,
            customers: deliveredCustomers
        });

    } catch (error: any) {
        console.error('Error fetching delivery report:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
