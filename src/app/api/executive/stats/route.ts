import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Helper for TR Time
const getTRDate = (d: Date) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
    return new Date(Date.UTC(
        parseInt(getPart('year')),
        parseInt(getPart('month')) - 1,
        parseInt(getPart('day')),
        0, 0, 0
    ));
}

export async function GET(req: any) {
    try {
        const { searchParams } = new URL(req.url);
        const queryStart = searchParams.get('startDate');
        const queryEnd = searchParams.get('endDate');

        // Defaults (Today in TR Time)
        // 1. Calculate "Now" in TR
        const trNow = getTRDate(new Date());

        // Define variables using the original names to handle both cases (Default vs Custom)
        // This ensures downstream code (startOfToday usage) remains valid.
        let startOfToday: string;
        let endOfToday: string;

        if (queryStart && queryEnd) {
            // Use User Provided Range (Assume YYYY-MM-DD)
            startOfToday = `${queryStart}T00:00:00.000`;
            endOfToday = `${queryEnd}T23:59:59.999`;
        } else {
            // Default: Today
            const trOffset = 3 * 60 * 60 * 1000;
            const todayTR = new Date(trNow.getTime() - trOffset);
            startOfToday = todayTR.toISOString();
            endOfToday = new Date(todayTR.getTime() + (24 * 60 * 60 * 1000) - 1).toISOString();
        }

        // Comparison Period (Previous Day or Parallel Period)
        // Map to "Yesterday" variables
        const rangeStartObj = new Date(startOfToday);
        const prevDayObj = new Date(rangeStartObj.getTime() - (24 * 60 * 60 * 1000));
        const startOfYesterday = prevDayObj.toISOString();
        const endOfYesterday = new Date(prevDayObj.getTime() + (24 * 60 * 60 * 1000) - 1).toISOString();

        // Month Start (Of the selected start date's month)
        const rangeYear = rangeStartObj.getFullYear();
        const rangeMonth = rangeStartObj.getMonth();
        // Use UTC 00:00 for 1st of month
        // Simplifying: Just YYYY-MM-01T00:00:00.000Z
        const monthStartObj = new Date(Date.UTC(rangeYear, rangeMonth, 1, 0, 0, 0));
        const startOfMonth = monthStartObj.toISOString();


        // --- 1. FUNNEL METRICS (Today vs Yesterday) ---
        // We need: Calls, Leads (Applications), Approvals, Deliveries

        // A. CALLS (Aranan)
        const { count: callsToday } = await supabaseAdmin.from('leads').select('id', { count: 'exact', head: true })
            .gte('son_arama_zamani', startOfToday).lte('son_arama_zamani', endOfToday);

        const { count: callsYesterday } = await supabaseAdmin.from('leads').select('id', { count: 'exact', head: true })
            .gte('son_arama_zamani', startOfYesterday).lte('son_arama_zamani', endOfYesterday);

        // B. APPLICATIONS (Başvuru) - ROBUST CHECK
        // Using "updated_at" for speed, checking strictly for application statuses.
        // Statuses matches "Reports" logic: 'Başvuru alındı', 'Onaya gönderildi', 'Onay Bekleniyor', 'Eksik Evrak' etc.
        const appStatusQuery = `durum.eq.Başvuru alındı,durum.eq.Onaya gönderildi,durum.eq.Onaya sunuldu,durum.eq.Onay bekleniyor,durum.eq.Onay bekliyor,durum.eq.Eksik evrak bekleniyor,onay_durumu.eq.Onay Bekliyor`;

        const { count: leadsToday } = await supabaseAdmin.from('leads').select('id', { count: 'exact', head: true })
            .or(appStatusQuery)
            .gte('updated_at', startOfToday).lte('updated_at', endOfToday);

        const { count: leadsYesterday } = await supabaseAdmin.from('leads').select('id', { count: 'exact', head: true })
            .or(appStatusQuery)
            .gte('updated_at', startOfYesterday).lte('updated_at', endOfYesterday);

        // C. APPROVALS (Onay) - 'onay_durumu' = 'Onaylandı'
        const { count: approvedToday } = await supabaseAdmin.from('leads').select('id', { count: 'exact', head: true })
            .eq('onay_durumu', 'Onaylandı')
            .gte('updated_at', startOfToday).lte('updated_at', endOfToday);

        const { count: approvedYesterday } = await supabaseAdmin.from('leads').select('id', { count: 'exact', head: true })
            .eq('onay_durumu', 'Onaylandı')
            .gte('updated_at', startOfYesterday).lte('updated_at', endOfYesterday);

        // D. DELIVERIES (Teslimat) - 'durum' = 'Teslim edildi' using 'teslim_tarihi'
        // Ideally rely on 'teslim_tarihi' if set, else updated_at
        const { data: deliveriesTodayRows, error: delError } = await supabaseAdmin.from('leads')
            .select('id, satilan_urunler, teslim_tarihi, ad_soyad, sahip_email, satis_fiyati') // satis_fiyati might be on lead or in items
            .eq('durum', 'Teslim edildi')
            .gte('teslim_tarihi', startOfToday); // deliveries are strictly tracked by date

        const { count: deliveriesYesterday } = await supabaseAdmin.from('leads').select('id', { count: 'exact', head: true })
            .eq('durum', 'Teslim edildi')
            .gte('teslim_tarihi', startOfYesterday).lt('teslim_tarihi', startOfToday);


        // --- 2. DAILY TURNOVER & DELIVERY LIST ---
        let dailyTurnover = 0;
        const dailyDeliveries: any[] = [];

        // Helper to parse currency
        const parsePrice = (p: any) => {
            if (!p) return 0;
            let str = String(p).replace(/[^0-9,.-]/g, '');
            if (str.includes(',') && str.includes('.')) str = str.replace(/\./g, '').replace(',', '.');
            else if (str.includes(',')) str = str.replace(',', '.');
            return parseFloat(str) || 0;
        };

        if (deliveriesTodayRows) {
            deliveriesTodayRows.forEach((lead: any) => {
                let items: any[] = [];
                try {
                    if (typeof lead.satilan_urunler === 'string') items = JSON.parse(lead.satilan_urunler);
                    else if (Array.isArray(lead.satilan_urunler)) items = lead.satilan_urunler;
                } catch (e) { }

                let leadTotal = 0;

                // If items exist, calculate from them
                if (items.length > 0) {
                    items.forEach(item => {
                        const price = parsePrice(item.satis_fiyati || item.fiyat);
                        leadTotal += price;
                        dailyDeliveries.push({
                            customer: lead.ad_soyad,
                            product: item.marka ? `${item.marka} ${item.model}` : (item.urun_adi || 'Ürün'),
                            price: price,
                            user: lead.sahip_email
                        });
                    });
                } else {
                    // Fallback using single price field on lead if items are empty?
                    // Skipping for robustness
                }
                dailyTurnover += leadTotal;
            });
        }

        // --- 3. TEAM & ANALYTICS (Existing Logic - Simplified) ---
        // Fetch monthly data for these
        const { data: monthSales } = await supabaseAdmin
            .from('leads')
            .select('id, satilan_urunler, sahip_email, sehir, dogum_tarihi')
            .or(`durum.eq.Teslim edildi,durum.eq.Satış yapıldı/Tamamlandı`)
            .gte('updated_at', startOfMonth);

        const teamStats: Record<string, { sales: number, revenue: number, name: string }> = {};
        const cityStats: Record<string, number> = {};
        const ageStats: Record<string, number> = {};
        const seenIds = new Set();
        let monthlyTurnover = 0;

        (monthSales || []).forEach((lead: any) => {
            let items: any[] = [];
            try {
                if (typeof lead.satilan_urunler === 'string') items = JSON.parse(lead.satilan_urunler);
                else if (Array.isArray(lead.satilan_urunler)) items = lead.satilan_urunler;
            } catch (e) { }

            let rev = 0;
            items.forEach(i => rev += parsePrice(i.satis_fiyati || i.fiyat));
            monthlyTurnover += rev;

            const user = lead.sahip_email || 'Unknown';
            if (!teamStats[user]) teamStats[user] = { sales: 0, revenue: 0, name: user.split('@')[0] };
            teamStats[user].sales += (items.length || 1);
            teamStats[user].revenue += rev;

            if (!seenIds.has(lead.id)) {
                seenIds.add(lead.id);
                if (lead.sehir) cityStats[lead.sehir] = (cityStats[lead.sehir] || 0) + 1;
                if (lead.dogum_tarihi) {
                    const by = new Date(lead.dogum_tarihi).getFullYear();
                    const age = new Date().getFullYear() - by;
                    const g = age < 25 ? '18-24' : age < 35 ? '25-34' : age < 45 ? '35-44' : age < 55 ? '45-54' : '55+';
                    ageStats[g] = (ageStats[g] || 0) + 1;
                }
            }
        });

        const sortedTeam = Object.values(teamStats).sort((a, b) => b.sales - a.sales).slice(0, 5);
        const sortedCity = Object.entries(cityStats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
        const sortedAge = Object.entries(ageStats).map(([name, value]) => ({ name, value }));

        // --- 4. OPERATIONAL TOTALS (Month to Date) ---
        // Fetch logs for the whole month to count aggregated actions
        const { count: totalCalls } = await supabaseAdmin.from('activity_logs').select('id', { count: 'exact', head: true })
            .eq('action', 'CLICK_CALL')
            .gte('timestamp', startOfMonth);

        const { count: totalSms } = await supabaseAdmin.from('activity_logs').select('id', { count: 'exact', head: true })
            .or('action.eq.SEND_SMS,action.eq.CLICK_SMS')
            .gte('timestamp', startOfMonth);

        const { count: totalWhatsapp } = await supabaseAdmin.from('activity_logs').select('id', { count: 'exact', head: true })
            .or('action.eq.SEND_WHATSAPP,action.eq.CLICK_WHATSAPP')
            .gte('timestamp', startOfMonth);

        // Backoffice logs (approximated by removing known actions)
        const { count: totalLogs } = await supabaseAdmin.from('activity_logs').select('id', { count: 'exact', head: true })
            .not('action', 'in', '("CLICK_CALL","SEND_SMS","CLICK_SMS","SEND_WHATSAPP","CLICK_WHATSAPP","PULL_LEAD")')
            .gte('timestamp', startOfMonth);

        // Calculate Total Product Count vs Sales Count
        // 'sortedTeam' sales is actually product count based on current logic (items.length).
        // Let's sum it up for "Total Products Sold"
        const totalProductsSold = Object.values(teamStats).reduce((acc, curr) => acc + curr.sales, 0);
        // "Sales Count" refers to number of leads closed (Deals).
        const totalDealsClosed = (monthSales || []).length;

        return NextResponse.json({
            funnel: {
                calls: { today: callsToday || 0, yesterday: callsYesterday || 0 },
                leads: { today: leadsToday || 0, yesterday: leadsYesterday || 0 },
                approved: { today: approvedToday || 0, yesterday: approvedYesterday || 0 },
                delivered: { today: (deliveriesTodayRows?.length || 0), yesterday: deliveriesYesterday || 0 }
            },
            finance: {
                dailyTurnover,
                monthlyTurnover,
                target: 100 // Legacy support
            },
            operational: {
                totalCalls: totalCalls || 0,
                totalSms: totalSms || 0,
                totalWhatsapp: totalWhatsapp || 0,
                totalLogs: totalLogs || 0,
                totalProducts: totalProductsSold,
                totalDeals: totalDealsClosed
            },
            dailyDeliveries: dailyDeliveries.reverse(), // Newest first
            team: sortedTeam,
            analytics: { city: sortedCity, age: sortedAge }
        });

    } catch (error: any) {
        console.error('Executive API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
