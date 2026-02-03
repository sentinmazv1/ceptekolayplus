
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

        let logQuery = supabaseAdmin
            .from('activity_logs')
            .select('lead_id, created_at, new_value')
            .or('new_value.ilike.%Teslim edildi%,new_value.ilike.%Satış yapıldı%,new_value.ilike.%Tamamlandı%');

        // Apply Log-Based Date Filter
        if (startDate && endDate) {
            const startIso = new Date(startDate).toISOString();
            const endIso = new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString();
            logQuery = logQuery.gte('created_at', startIso).lte('created_at', endIso);
        }

        const { data: logs, error: logError } = await logQuery;

        if (logError) throw logError;

        if (!logs || logs.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Get Distinct Lead IDs and Map Log Dates
        const leadDateMap = new Map<string, string>();
        logs.forEach((log: any) => {
            // Keep the LATEST log date if multiple exist (though usually one delivery event)
            // Or keep EARLIEST? "When was it delivered?" -> Earliest transition to Delivered in this range.
            if (!leadDateMap.has(log.lead_id)) {
                leadDateMap.set(log.lead_id, log.created_at);
            }
        });

        const leadIds = Array.from(leadDateMap.keys());

        // Fetch Leads
        const { data: leads, error: leadError } = await supabaseAdmin
            .from('leads')
            .select('*')
            .in('id', leadIds);

        if (leadError) throw leadError;

        const results: any[] = [];

        leads?.forEach((lead: any) => {
            let items: any[] = [];
            try {
                if (Array.isArray(lead.satilan_urunler)) items = lead.satilan_urunler;
                else if (typeof lead.satilan_urunler === 'string') items = JSON.parse(lead.satilan_urunler);
            } catch (e) { }

            let totalRevenue = 0;
            let soldItemsText: string[] = [];

            if (items.length > 0) {
                items.forEach(item => {
                    totalRevenue += parsePrice(item.satis_fiyati || item.fiyat);
                    soldItemsText.push(`${item.marka || ''} ${item.model || ''} (${parsePrice(item.satis_fiyati || item.fiyat).toLocaleString('tr-TR')} ₺)`);
                });
            } else {
                totalRevenue = parsePrice(lead.kredi_limiti || lead.satis_fiyati);
                soldItemsText.push('Ürün Detayı Yok');
            }

            // Use the LOG date as the true delivery date
            const trueDate = leadDateMap.get(lead.id) || lead.teslim_tarihi;

            results.push({
                id: lead.id,
                name: `${lead.ad || ''} ${lead.soyad || ''}`,
                phone: lead.telefon_1,
                tc: lead.tc_kimlik,
                work: lead.calisma_sekli || lead.meslek || '-',
                workPlace: lead.is_yeri || '-',
                limit: lead.kredi_limiti,
                seller: lead.assigned_to || lead.sahip || 'Atanmamış', // Use AssignedTo as primary source of truth as requested
                items: soldItemsText.join(', '),
                revenue: totalRevenue,
                date: trueDate
            });
        });

        // Sort by Date Descending
        results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({ success: true, data: results });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
