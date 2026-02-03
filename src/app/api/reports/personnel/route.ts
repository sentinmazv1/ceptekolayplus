
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

        const personnelMap = new Map<string, any>();
        const getStats = (name: string) => {
            if (!personnelMap.has(name)) {
                personnelMap.set(name, {
                    name,
                    calls: 0,
                    sms: 0,
                    whatsapp: 0,
                    applications: 0,
                    attorneyQuery: 0,
                    attorneyClean: 0,
                    attorneyRisky: 0,
                    approvedCount: 0,
                    approvedLimit: 0,
                    deliveredCount: 0,
                    deliveredRevenue: 0
                });
            }
            return personnelMap.get(name);
        };

        // --- 1. FETCH LOGS (Actions & Attribution Source) ---
        // We fetch logs to:
        // A) Count actions (Calls, SMS...) in range.
        // B) Find who moved lead to "Başvuru alındı" (Attribution).
        const { data: logs, error: logError } = await supabaseAdmin
            .from('activity_logs')
            .select('*');
        // We need ALL logs to find proper attribution even if action was in past, 
        // BUT for performance, maybe we restrict? 
        // User says: "Kim başvuruya çektiyse satıcısı odur". 
        // If checking attribution, we strictly need the log for that lead.
        // Let's fetch logs in range for "Counts", and maybe a separate query or wider query for attribution?
        // To be safe and since volume isn't massive yet, let's fetch logs overlapping the active leads or just "All Time" logs for attribution is safest but expensive.
        // Optimization: We only care about attribution for LEADS that are delivered in this period.
        // So we can fetch leads first, get their IDs, then fetch relevant logs? 
        // Let's stick to: Fetch logs in date range for ACTIVITY COUNTS. 
        // For ATTRIBUTION, we will query distinct logs for the specific delivered leads later.

        // Actually, let's just fetch logs in range for the "Activity Board".
        const { data: rangeLogs, error: rangeError } = await supabaseAdmin
            .from('activity_logs')
            .select('*')
            .gte('created_at', startIso)
            .lte('created_at', endIso);

        if (rangeError) throw rangeError;

        // Process Activity Counts (Strictly in Date Range)
        rangeLogs?.forEach((log: any) => {
            const user = log.performed_by || log.user_email || 'Bilinmeyen';
            const stats = getStats(user);
            const action = log.action;
            const newVal = String(log.new_value || '').toLowerCase();
            const note = String(log.note || '').toLowerCase();

            if (action === 'PULL_LEAD') stats.calls++;
            if (action === 'SEND_SMS' || action === 'CLICK_SMS') stats.sms++;
            if (action === 'SEND_WHATSAPP' || action === 'CLICK_WHATSAPP') stats.whatsapp++;

            if (newVal.includes('başvuru alındı')) stats.applications++;
            if ((newVal.includes('avukat') && newVal.includes('bekliyor') || newVal.includes('incelemesinde'))) stats.attorneyQuery++;
            if ((newVal.includes('temiz') || note.includes('temiz')) && newVal.includes('avukat')) stats.attorneyClean++;
            if ((newVal.includes('riskli') || note.includes('riskli') || newVal.includes('sorunlu')) && newVal.includes('avukat')) stats.attorneyRisky++;
        });

        // --- 2. FETCH LEADS (Financials) ---
        // We need leads that might have approved/delivered events in this month.
        const { data: leads, error: leadError } = await supabaseAdmin
            .from('leads')
            .select('*')
            .or(`updated_at.gte.${startIso},teslim_tarihi.gte.${startIso},onay_tarihi.gte.${startIso}`);

        if (leadError) throw leadError;

        const deliveredLeadsDetails: any[] = [];

        // For attribution, we need to know who moved these leads to "Başvuru alındı".
        // Collect IDs of delivered leads in range.
        const deliveredLeadIds = new Set<string>();
        leads?.forEach((lead: any) => {
            // Check if potentially delivered in range
            const isDeliveredStatus = ['Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Satış Yapıldı'].includes(lead.durum);
            if (isDeliveredStatus) deliveredLeadIds.add(lead.id);
        });

        // Fetch attribution logs for these specific leads
        let attributionMap = new Map<string, string>(); // LeadID -> User
        if (deliveredLeadIds.size > 0) {
            const { data: attLogs } = await supabaseAdmin
                .from('activity_logs')
                .select('lead_id, performed_by, created_at, new_value')
                .in('lead_id', Array.from(deliveredLeadIds))
                .order('created_at', { ascending: false }); // Latest first

            attLogs?.forEach((log: any) => {
                // Look for "Başvuru alındı"
                const val = String(log.new_value || '').toLowerCase();
                if (val.includes('başvuru alındı')) {
                    // Start filling map. Since we ordered desc, the first one we find is the latest.
                    // Or do we want the EARLIEST? "Whoever pulled it to application". 
                    // Usually the one who converted it. 
                    // I'll take the LATEST one before delivery basically.
                    if (!attributionMap.has(log.lead_id)) {
                        attributionMap.set(log.lead_id, log.performed_by);
                    }
                }
            });
        }

        // Process Leads
        leads?.forEach((lead: any) => {
            // APPROVED LOGIC (Ownership = Assigned To usually, or attribution?)
            // User only specified "Delivered" logic. I will stick to "assigned_to" for Approval for now unless requested.
            let approvedOwner = lead.assigned_to || 'Atanmamış';
            // Adjust attribution for Approved as well? "Kim başvuruya çektiyse..." implies ownership.
            // Let's try to use attributionMap if available, else fallback.
            if (attributionMap.has(lead.id)) approvedOwner = attributionMap.get(lead.id);

            const appStats = getStats(approvedOwner);

            if (lead.onay_durumu === 'Onaylandı') {
                const onayTs = lead.onay_tarihi ? new Date(lead.onay_tarihi).getTime() : 0;
                if (onayTs >= startTs && onayTs <= endTs) {
                    appStats.approvedCount++;
                    appStats.approvedLimit += parsePrice(lead.kredi_limiti);
                }
            }

            // DELIVERED LOGIC
            const isDeliveredStatus = ['Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Satış Yapıldı'].includes(lead.durum);
            if (isDeliveredStatus) {
                // Determine Seller
                let seller = lead.assigned_to || 'Atanmamış';
                if (attributionMap.has(lead.id)) {
                    seller = attributionMap.get(lead.id);
                }

                // Check Items
                let items: any[] = [];
                try {
                    if (Array.isArray(lead.satilan_urunler)) items = lead.satilan_urunler;
                    else if (typeof lead.satilan_urunler === 'string') items = JSON.parse(lead.satilan_urunler);
                } catch (e) { }

                let revenue = 0;
                let hasItem = false;
                let soldItemsText: string[] = [];

                if (items.length > 0) {
                    items.forEach(item => {
                        const itemDate = item.satis_tarihi || item.teslim_tarihi || lead.teslim_tarihi;
                        if (itemDate) {
                            const d = new Date(itemDate).getTime();
                            if (d >= startTs && d <= endTs) {
                                revenue += parsePrice(item.satis_fiyati || item.fiyat);
                                hasItem = true;
                                soldItemsText.push(`${item.marka || ''} ${item.model || ''} (${parsePrice(item.satis_fiyati || item.fiyat).toLocaleString('tr-TR')} ₺)`);
                            }
                        }
                    });
                } else {
                    // Fallback
                    const leadDate = lead.teslim_tarihi || lead.satis_tarihi;
                    if (leadDate) {
                        const d = new Date(leadDate).getTime();
                        if (d >= startTs && d <= endTs) {
                            revenue += parsePrice(lead.kredi_limiti || lead.satis_fiyati);
                            hasItem = true;
                            soldItemsText.push("Ürün Detayı Yok");
                        }
                    }
                }

                if (hasItem) {
                    const sellerStats = getStats(seller);
                    sellerStats.deliveredCount++;
                    sellerStats.deliveredRevenue += revenue;

                    // Add to Detailed List
                    deliveredLeadsDetails.push({
                        id: lead.id,
                        name: `${lead.ad || ''} ${lead.soyad || ''}`,
                        phone: lead.telefon_1,
                        tc: lead.tc_kimlik,
                        work: lead.calisma_sekli || lead.meslek,
                        limit: lead.kredi_limiti,
                        seller: seller,
                        items: soldItemsText.join(', '),
                        revenue: revenue,
                        date: lead.teslim_tarihi
                    });
                }
            }
        });

        // 3. Filtering & Sorting
        const filteredData = Array.from(personnelMap.values())
            .filter(p => p.name !== 'Atanmamış' && p.name !== 'ibrahimsentinmaz@gmail.com')
            .sort((a, b) => b.deliveredRevenue - a.deliveredRevenue);

        return NextResponse.json({
            success: true,
            data: filteredData,
            deliveredLeads: deliveredLeadsDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
