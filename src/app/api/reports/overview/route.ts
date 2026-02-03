
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
        // 1. Determine Current Month Range (Turkey Time: UTC+3)
        // We want 1st of this month 00:00 to Now/End of month.
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        // Adjust to TRT roughly for ISO string if needed, or just use ISO.
        // Simple approach: YYYY-MM-01T00:00:00+03:00.

        const trFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' });
        const parts = trFormatter.formatToParts(now);
        const y = parts.find(p => p.type === 'year')?.value;
        const m = parts.find(p => p.type === 'month')?.value;

        const startIso = `${y}-${m}-01T00:00:00.000+03:00`;
        const endIso = new Date().toISOString(); // Up to now

        // 2. Fetch Logs for Activity-Based KPIs (Calls, SMS, WA, Status Changes)
        const { data: logs, error: logError } = await supabaseAdmin
            .from('activity_logs')
            .select('*')
            .gte('created_at', startIso);

        if (logError) throw logError;

        // 3. Fetch "Live" Leads for Revenue/Stock verification (Lead details usually hold the JSON)
        // We need leads that might have been sold/approved this month.
        // It's safer to fetch leads updated this month for revenue calc.
        const { data: leads, error: leadError } = await supabaseAdmin
            .from('leads')
            .select('*')
            .or(`updated_at.gte.${startIso},teslim_tarihi.gte.${startIso},onay_tarihi.gte.${startIso}`);

        if (leadError) throw leadError;

        // --- CALCULATION ---
        const stats = {
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
        };

        const uniqueLeads = {
            app: new Set(),
            atQuery: new Set(),
            atClean: new Set(),
            atRisky: new Set()
        };

        // Process Logs (Activity Counts & Transitions)
        logs?.forEach((log: any) => {
            const action = log.action;
            const newVal = String(log.new_value || '').toLowerCase();
            const note = String(log.note || '').toLowerCase();

            // 1. Communications
            if (action === 'CLICK_CALL' || action === 'PULL_LEAD') stats.calls++; // User asked for "Müşteri Çek" implied in "Total Arama" context usually, or separate? 
            // User said: "Müşteri çek butonuna basılmış yekün toplam". PULL_LEAD is exactly that.
            // Wait, usually "Arama" is CLICK_CALL. "Müşteri Çek" is PULL_LEAD.
            // User text: "Toplam arama sayısı ( Müşteri çek butonuna basılmış yekün toplam tüm personeller)" -> ambiguous? 
            // It says "Arama sayısı" BUT describes "Müşteri çek". 
            // I will count BOTH PULL_LEAD and CLICK_CALL for now or just PULL_LEAD as explicitly described in parenthesis.
            // Let's stick to PULL_LEAD if the user explicitly defined it as "Müşteri çek butonuna basılmış". 
            // Actually, let's include CLICK_CALL too because usually 'Arama' implies calling. 
            // I'll group them for 'Calls' to be safe, or separate? 
            // Decision: User definition in parenthesis overrides title. "Müşteri çek butonuna basılmış". 
            // I will count PULL_LEAD.
            if (action === 'PULL_LEAD') stats.calls++;

            if (action === 'SEND_SMS' || action === 'CLICK_SMS') stats.sms++;
            if (action === 'SEND_WHATSAPP' || action === 'CLICK_WHATSAPP') stats.whatsapp++;

            // 2. Status Transitions (Unique per lead to avoid double counting same month moves?)
            // "durumuna çektiği toplam müşteri kartı" -> simple log count or unique leads?
            // Usually unique leads per month is better metric.

            // Apps: "Başvuru alındı"
            if (newVal.includes('başvuru alındı') && !uniqueLeads.app.has(log.lead_id)) {
                stats.applications++;
                uniqueLeads.app.add(log.lead_id);
            }

            // Attorney: "Bekliyor" (Avukat İncelemesinde / Sorguda etc)
            // Assuming status or note/value indicates this.
            if ((newVal.includes('avukat') && newVal.includes('bekliyor') || newVal.includes('incelemesinde')) && !uniqueLeads.atQuery.has(log.lead_id)) {
                stats.attorneyQuery++;
                uniqueLeads.atQuery.add(log.lead_id);
            }

            // Attorney: "Temiz"
            if ((newVal.includes('temiz') || note.includes('temiz')) && !uniqueLeads.atClean.has(log.lead_id)) {
                stats.attorneyClean++;
                uniqueLeads.atClean.add(log.lead_id);
            }

            // Attorney: "Riskli"
            if ((newVal.includes('riskli') || note.includes('riskli') || newVal.includes('sorunlu')) && !uniqueLeads.atRisky.has(log.lead_id)) {
                stats.attorneyRisky++;
                uniqueLeads.atRisky.add(log.lead_id);
            }
        });

        // Process Leads for Financials (Approved & Delivered)
        // We iterate LEADS for this because we need the current accurate Limit/Price data,
        // and identifying "Approved This Month" via logs is harder than checking `onay_tarihi`.

        leads?.forEach((lead: any) => {
            const startTs = new Date(startIso).getTime();

            // 8. Approved (Onaylı)
            // Check 'onay_durumu' or 'durum'
            if (lead.onay_durumu === 'Onaylandı') {
                const onayTs = lead.onay_tarihi ? new Date(lead.onay_tarihi).getTime() : 0;
                // If approval date is in range
                if (onayTs >= startTs) {
                    stats.approvedCount++;
                    stats.approvedLimit += parsePrice(lead.kredi_limiti);
                }
            }

            // 9. Delivered (Teslim) - ITEM BASED LOGIC
            const isDeliveredStatus = ['Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Satış Yapıldı'].includes(lead.durum);
            if (isDeliveredStatus) {
                // Parse Items
                let items: any[] = [];
                try {
                    if (Array.isArray(lead.satilan_urunler)) items = lead.satilan_urunler;
                    else if (typeof lead.satilan_urunler === 'string') items = JSON.parse(lead.satilan_urunler);
                } catch (e) { }

                let hasItemInRange = false;

                if (items.length > 0) {
                    items.forEach(item => {
                        const itemDate = item.satis_tarihi || item.teslim_tarihi || lead.teslim_tarihi;
                        if (itemDate && new Date(itemDate).getTime() >= startTs) {
                            stats.deliveredRevenue += parsePrice(item.satis_fiyati || item.fiyat);
                            hasItemInRange = true;
                        }
                    });
                } else {
                    // Fallback Legacy
                    const leadDate = lead.teslim_tarihi || lead.satis_tarihi;
                    if (leadDate && new Date(leadDate).getTime() >= startTs) {
                        stats.deliveredRevenue += parsePrice(lead.kredi_limiti || lead.satis_fiyati);
                        hasItemInRange = true;
                    }
                }

                if (hasItemInRange) {
                    stats.deliveredCount++; // One customer count if ANY item was sold this month
                }
            }
        });

        return NextResponse.json({ success: true, stats });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
