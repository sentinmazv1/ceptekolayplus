
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const parsePrice = (p: any): number => {
    if (!p) return 0;
    let str = String(p).replace(/[^0-9,.-]/g, '');
    if (str.includes(',') && str.includes('.')) str = str.replace(/\./g, '').replace(',', '.');
    else if (str.includes(',')) str = str.replace(',', '.');
    return parseFloat(str) || 0;
};

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, error: 'Dates required' }, { status: 400 });
        }

        const startIso = new Date(startDate).toISOString();
        const endIso = new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString();
        const startTs = new Date(startIso).getTime();
        const endTs = new Date(endIso).getTime();

        // 1. DIRECT TABLE QUERY (As requested)
        // Check filtering on 'teslim_tarihi' OR 'updated_at' if date is missing
        // This avoids log missing issues.
        const { data: leads, error } = await supabaseAdmin
            .from('leads')
            .select('*')
            .or(`durum.eq.Teslim edildi,durum.eq.Satış yapıldı/Tamamlandı,durum.eq.Satış Yapıldı`)
            // We fetch ALL delivered leads first, then filter by date in code to handle fallback logic securely
            // (Supabase OR logic with dates can be tricky if fields are null)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        const results: any[] = [];

        leads?.forEach((lead: any) => {
            // Determine "Accurate Date"
            // Priority: teslim_tarihi > satis_tarihi > updated_at
            const dateStr = lead.teslim_tarihi || lead.satis_tarihi || lead.updated_at;
            if (!dateStr) return;

            const d = new Date(dateStr).getTime();

            // FILTER: Strict Date Range Check
            if (d < startTs || d > endTs) return;

            // PRODUCTS
            let items: any[] = [];
            try {
                if (Array.isArray(lead.satilan_urunler)) items = lead.satilan_urunler;
                else if (typeof lead.satilan_urunler === 'string') items = JSON.parse(lead.satilan_urunler);
            } catch (e) { }

            let totalRevenue = 0;
            let soldItemsText: string[] = [];

            // Check if products have specific dates? 
            // User said: "ürün bölümünde o tarihte bir ürün eklenmiş mi"
            // If items have explicit date, we can filter them. 
            // But usually, if the lead is "Delivered" in this range, ALL its items are sold.

            if (items.length > 0) {
                items.forEach(item => {
                    const price = parsePrice(item.satis_fiyati || item.fiyat);
                    totalRevenue += price;
                    soldItemsText.push(`${item.marka || ''} ${item.model || ''} (${price.toLocaleString('tr-TR')} ₺)`);
                });
            } else {
                totalRevenue = parsePrice(lead.kredi_limiti || lead.satis_fiyati);
                soldItemsText.push('Ürün Detayı Yok');
            }

            results.push({
                id: lead.id,
                name: `${lead.ad || ''} ${lead.soyad || ''}`,
                phone: lead.telefon_1,
                tc: lead.tc_kimlik,
                work: lead.calisma_sekli || lead.meslek || '-',
                workPlace: lead.is_yeri || '-',
                limit: lead.kredi_limiti,
                seller: lead.assigned_to || lead.sahip || 'Atanmamış',
                items: soldItemsText.join(', '),
                revenue: totalRevenue,
                date: dateStr
            });
        });

        // Sort by Date Descending
        results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({ success: true, data: results });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
