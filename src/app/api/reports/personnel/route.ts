
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
            const key = name || 'Bilinmeyen'; // Safety
            if (!personnelMap.has(key)) {
                personnelMap.set(key, {
                    name: key,
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
            return personnelMap.get(key);
        };

        // --- 1. FETCH LOGS (Activity Counts) ---
        const { data: rangeLogs, error: rangeError } = await supabaseAdmin
            .from('activity_logs')
            .select('*')
            .gte('created_at', startIso)
            .lte('created_at', endIso);

        if (rangeError) throw rangeError;

        rangeLogs?.forEach((log: any) => {
            const user = log.performed_by || log.user_email || 'Bilinmeyen';
            const stats = getStats(user);
            const action = log.action;
            const newVal = String(log.new_value || '').toLowerCase();
            const note = String(log.note || '').toLowerCase();

            // Calls / SMS / WA
            if (action === 'PULL_LEAD') stats.calls++;
            if (action === 'SEND_SMS' || action === 'CLICK_SMS') stats.sms++;
            if (action === 'SEND_WHATSAPP' || action === 'CLICK_WHATSAPP') stats.whatsapp++;

            // Status Transitions
            // Broaden matching for Attorney to ensure data capture
            if (newVal.includes('başvuru alındı')) stats.applications++;

            // Attorney Query: "Avukat" generic or specific "İncelemesinde"/"Bekliyor"
            if ((newVal.includes('avukat') && (newVal.includes('bekliyor') || newVal.includes('incelemesinde')))) {
                stats.attorneyQuery++;
            }

            // Attorney Result: Clean vs Risky
            // Sometimes it's just "Temiz" or "Riskli" without "Avukat" prefix in logs
            if (newVal.includes('temiz') || note.includes('temiz')) {
                stats.attorneyClean++;
            }
            if (newVal.includes('riskli') || note.includes('riskli') || newVal.includes('sorunlu')) {
                stats.attorneyRisky++;
            }
        });

        // --- 2. FETCH LEADS (Financials & List) ---
        const { data: leads, error: leadError } = await supabaseAdmin
            .from('leads')
            .select('*')
            .or(`updated_at.gte.${startIso},teslim_tarihi.gte.${startIso},onay_tarihi.gte.${startIso}`);

        if (leadError) throw leadError;

        const deliveredLeadsDetails: any[] = [];
        const deliveredLeadIds = new Set<string>();

        leads?.forEach((lead: any) => {
            const isDeliveredStatus = ['Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Satış Yapıldı'].includes(lead.durum);
            if (isDeliveredStatus) deliveredLeadIds.add(lead.id);
        });

        // --- 3. ROBUST ATTRIBUTION ---
        const salesAttribution = new Map<string, string>(); // LeadID -> Seller Name

        if (deliveredLeadIds.size > 0) {
            const { data: attLogs } = await supabaseAdmin
                .from('activity_logs')
                .select('lead_id, performed_by, created_at, new_value, action')
                .in('lead_id', Array.from(deliveredLeadIds))
                .order('created_at', { ascending: true }); // Oldest first

            const leadLogs = new Map<string, any[]>();
            attLogs?.forEach((log: any) => {
                if (!leadLogs.has(log.lead_id)) leadLogs.set(log.lead_id, []);
                leadLogs.get(log.lead_id)?.push(log);
            });

            deliveredLeadIds.forEach(leadId => {
                const logs = leadLogs.get(leadId) || [];
                let seller = null;

                // Priority 1: "Başvuru alındı"
                const appLog = logs.find((l: any) => String(l.new_value || '').toLowerCase().includes('başvuru alındı'));
                if (appLog) seller = appLog.performed_by;

                // Priority 2: "Onaylandı"
                if (!seller) {
                    const approvedLog = logs.find((l: any) => String(l.new_value || '').toLowerCase().includes('onaylandı'));
                    if (approvedLog) seller = approvedLog.performed_by;
                }

                // Priority 3: "Teslim edildi"
                if (!seller) {
                    const deliveredLog = logs.find((l: any) => String(l.new_value || '').toLowerCase().includes('teslim'));
                    if (deliveredLog) seller = deliveredLog.performed_by;
                }

                if (seller) salesAttribution.set(leadId, seller);
            });
        }

        // --- 4. CALCULATE STATS ---
        leads?.forEach((lead: any) => {
            let seller = lead.assigned_to || 'Atanmamış';
            if (salesAttribution.has(lead.id)) seller = salesAttribution.get(lead.id);

            // Normalize
            if (seller === 'ibrahimsentinmaz@gmail.com') seller = 'İbrahim (Admin)';

            const sellerStats = getStats(seller);

            // Limit Stats
            if (lead.onay_durumu === 'Onaylandı') {
                const onayTs = lead.onay_tarihi ? new Date(lead.onay_tarihi).getTime() : 0;
                if (onayTs >= startTs && onayTs <= endTs) {
                    sellerStats.approvedCount++;
                    sellerStats.approvedLimit += parsePrice(lead.kredi_limiti);
                }
            }

            // Delivered Stats
            const isDeliveredStatus = ['Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Satış Yapıldı'].includes(lead.durum);
            if (isDeliveredStatus) {
                let items: any[] = [];
                try {
                    if (Array.isArray(lead.satilan_urunler)) items = lead.satilan_urunler;
                    else if (typeof lead.satilan_urunler === 'string') items = JSON.parse(lead.satilan_urunler);
                } catch (e) { }

                let revenue = 0;
                let hasItemInPeriod = false;
                let soldItemsText: string[] = [];

                if (items.length > 0) {
                    items.forEach(item => {
                        const itemDate = item.satis_tarihi || item.teslim_tarihi || lead.teslim_tarihi;
                        if (itemDate) {
                            const d = new Date(itemDate).getTime();
                            if (d >= startTs && d <= endTs) {
                                revenue += parsePrice(item.satis_fiyati || item.fiyat);
                                hasItemInPeriod = true;
                                soldItemsText.push(`${item.marka || ''} ${item.model || ''} (${parsePrice(item.satis_fiyati || item.fiyat).toLocaleString('tr-TR')} ₺)`);
                            }
                        }
                    });
                } else {
                    const leadDate = lead.teslim_tarihi || lead.satis_tarihi;
                    if (leadDate) {
                        const d = new Date(leadDate).getTime();
                        if (d >= startTs && d <= endTs) {
                            revenue += parsePrice(lead.kredi_limiti || lead.satis_fiyati);
                            hasItemInPeriod = true;
                            soldItemsText.push("Ürün Detayı Yok");
                        }
                    }
                }

                if (hasItemInPeriod) {
                    sellerStats.deliveredCount++;
                    sellerStats.deliveredRevenue += revenue;

                    deliveredLeadsDetails.push({
                        id: lead.id,
                        name: `${lead.ad || ''} ${lead.soyad || ''}`,
                        phone: lead.telefon_1,
                        tc: lead.tc_kimlik,
                        work: lead.calisma_sekli || lead.meslek || '-',
                        workPlace: lead.is_yeri || '-',
                        limit: lead.kredi_limiti,
                        seller: seller,
                        items: soldItemsText.join(', '),
                        revenue: revenue,
                        date: lead.teslim_tarihi || lead.satis_tarihi,
                    });
                }
            }
        });

        const filteredData = Array.from(personnelMap.values())
            .filter(p => p.name !== 'Atanmamış' && p.name !== 'ibrahimsentinmaz@gmail.com')
            .sort((a, b) => b.deliveredRevenue - a.deliveredRevenue);

        // FILTER THE LIST TOO (Fixes Data Mismatch)
        const filteredList = deliveredLeadsDetails
            .filter(l => l.seller !== 'Atanmamış' && l.seller !== 'ibrahimsentinmaz@gmail.com')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({
            success: true,
            data: filteredData,
            deliveredLeads: filteredList
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
