
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper for price parsing (matching legacy)
const parsePrice = (p: any): number => {
    if (!p) return 0;
    let str = String(p).replace(/[^0-9,.-]/g, '');
    if (str.includes(',') && str.includes('.')) str = str.replace(/\./g, '').replace(',', '.');
    else if (str.includes(',')) str = str.replace(',', '.');
    return parseFloat(str) || 0;
};

// Helper for User Normalization (matching legacy)
const normalizeUser = (u: string) => {
    if (!u) return 'Atanmamış';
    let norm = u.toLowerCase().trim();
    if (norm === 'funda') return 'funda@ceptekolayplus.com';
    if (norm === 'gözde' || norm === 'gozde') return 'gozde@ceptekolayplus.com';
    return norm; // Keep email format
};

export const dynamic = 'force-dynamic';

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
            // If normalized name is email, we might want to display a cleaner name, 
            // but for grouping, use the normalized key.
            if (!personnelMap.has(name)) {
                personnelMap.set(name, {
                    name: name,
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

        // --- 1. LOGS (For Activity Counts) ---
        const { data: rangeLogs } = await supabaseAdmin
            .from('activity_logs')
            .select('*')
            .gte('created_at', startIso)
            .lte('created_at', endIso);

        rangeLogs?.forEach((log: any) => {
            const rawUser = log.performed_by || log.user_email;
            if (!rawUser) return;
            // Filter ignorable users (MATCHING LEGACY)
            if (['sistem', 'system', 'admin', 'ibrahim', 'ibrahimsentinmaz@gmail.com'].some(x => rawUser.toLowerCase().includes(x))) return;

            const user = normalizeUser(rawUser);
            const stats = getStats(user);
            const action = log.action;
            const newVal = String(log.new_value || '').toLowerCase();
            const note = String(log.note || '').toLowerCase();

            // MATCHING LEGACY LOGIC EXACTLY
            if (action === 'PULL_LEAD') stats.calls++; // Legacy uses PULL_LEAD for 'pulled', CLICK_CALL for 'calls'. I'll stick to PULL_LEAD for general activity for now or combine.
            // Wait, legacy stats.performance counts CLICK_CALL as calls. 
            // I should probably count CLICK_CALL too.
            if (action === 'CLICK_CALL') stats.calls++;
            if (action === 'SEND_SMS' || action === 'CLICK_SMS') stats.sms++;
            if (action === 'SEND_WHATSAPP' || action === 'CLICK_WHATSAPP') stats.whatsapp++;

            // Applications (Strict Trigger Statuses)
            const validAppStatuses = ['başvuru alındı', 'onaya gönderildi', 'onay bekleniyor', 'eksik evrak bekleniyor'];
            if ((action === 'UPDATE_STATUS' || action === 'CREATED') && validAppStatuses.some(s => newVal.includes(s))) {
                stats.applications++;
            }

            // Attorney
            if (newVal.includes('avukat') || note.includes('avukat') || newVal.includes('sorgu') || note.includes('sorgu')) {
                if (newVal.includes('temiz') || note.includes('temiz')) stats.attorneyClean++;
                else if (newVal.includes('riskli') || note.includes('riskli') || newVal.includes('sorunlu')) stats.attorneyRisky++;
                else stats.attorneyQuery++;
            }
        });

        // --- 2. LEADS (Financials) ---
        const { data: leads } = await supabaseAdmin
            .from('leads')
            .select('*')
            .or(`updated_at.gte.${startIso},teslim_tarihi.gte.${startIso},onay_tarihi.gte.${startIso}`);

        const deliveredLeadsDetails: any[] = [];

        leads?.forEach((lead: any) => {
            const ownerRaw = lead.sahip || lead.sahip_email || lead.assigned_to; // Priority to 'sahip' like Legacy

            // IGNORE UNASSIGNED / ADMIN (Matching Legacy)
            if (!ownerRaw || ['sistem', 'system', 'admin', 'ibrahim', 'ibrahimsentinmaz@gmail.com'].some(x => ownerRaw.toLowerCase().includes(x))) return;

            const user = normalizeUser(ownerRaw);
            const stats = getStats(user);

            // Approved Logic
            if (lead.onay_durumu === 'Onaylandı') {
                const onayTs = lead.onay_tarihi ? new Date(lead.onay_tarihi).getTime() : 0;
                if (onayTs >= startTs && onayTs <= endTs) {
                    stats.approvedCount++;
                    stats.approvedLimit += parsePrice(lead.kredi_limiti);
                }
            }

            // Delivered Logic (Item Based)
            const isDeliveredStatus = ['Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Satış Yapıldı'].includes(lead.durum);
            if (isDeliveredStatus) {
                let items: any[] = [];
                try {
                    if (Array.isArray(lead.satilan_urunler)) items = lead.satilan_urunler;
                    else if (typeof lead.satilan_urunler === 'string') items = JSON.parse(lead.satilan_urunler);
                } catch (e) { }

                let itemRevenue = 0;
                let hasItemInPeriod = false;
                let soldItemsText: string[] = [];

                if (items.length > 0) {
                    items.forEach(item => {
                        const itemDate = item.satis_tarihi || item.teslim_tarihi || lead.teslim_tarihi;
                        if (itemDate) {
                            const d = new Date(itemDate).getTime();
                            if (d >= startTs && d <= endTs) {
                                itemRevenue += parsePrice(item.satis_fiyati || item.fiyat);
                                hasItemInPeriod = true;
                                soldItemsText.push(`${item.marka || ''} ${item.model || ''} (${parsePrice(item.satis_fiyati || item.fiyat).toLocaleString('tr-TR')} ₺)`);
                            }
                        } else if (lead.teslim_tarihi) {
                            // Fallback
                            const d = new Date(lead.teslim_tarihi).getTime();
                            if (d >= startTs && d <= endTs) {
                                itemRevenue += parsePrice(item.satis_fiyati || item.fiyat);
                                hasItemInPeriod = true;
                                soldItemsText.push(`${item.marka || ''} ${item.model || ''} (${parsePrice(item.satis_fiyati || item.fiyat).toLocaleString('tr-TR')} ₺)`);
                            }
                        }
                    });
                } else if (lead.teslim_tarihi) {
                    // Legacy Fallback
                    const d = new Date(lead.teslim_tarihi).getTime();
                    if (d >= startTs && d <= endTs) {
                        itemRevenue += parsePrice(lead.kredi_limiti || lead.satis_fiyati);
                        hasItemInPeriod = true;
                        soldItemsText.push('Ürün Detayı Yok');
                    }
                }

                if (hasItemInPeriod) {
                    stats.deliveredCount++;
                    stats.deliveredRevenue += itemRevenue;

                    deliveredLeadsDetails.push({
                        id: lead.id,
                        name: `${lead.ad || ''} ${lead.soyad || ''}`,
                        phone: lead.telefon_1,
                        tc: lead.tc_kimlik,
                        work: lead.calisma_sekli || lead.meslek || '-',
                        workPlace: lead.is_yeri || '-',
                        limit: lead.kredi_limiti,
                        seller: user,
                        items: soldItemsText.join(', '),
                        revenue: itemRevenue,
                        date: lead.teslim_tarihi || lead.satis_tarihi
                    });
                }
            }
        });

        // Final Filter & Sort
        const filteredData = Array.from(personnelMap.values())
            .sort((a, b) => b.deliveredRevenue - a.deliveredRevenue);

        // List matches Table Filter (Since we filtered 'leads' loop above)
        deliveredLeadsDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({
            success: true,
            data: filteredData,
            deliveredLeads: deliveredLeadsDetails
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
