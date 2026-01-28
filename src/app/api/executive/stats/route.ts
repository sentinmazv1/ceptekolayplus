import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const today = new Date();
        // Today Boundaries
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

        // Yesterday Boundaries
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString();
        const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59).toISOString();

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

        // --- 1. FUNNEL METRICS (Today vs Yesterday) ---
        // We need: Calls, Leads (Applications), Approvals, Deliveries

        // A. CALLS (Aranan) - Based on 'son_arama_zamani' updates checks or Logs? 
        // Using 'leads' table 'son_arama_zamani' is tricky for history. 
        // BETTER: Use 'activity_logs' for action='CALL' if available, OR 'leads' table approximate for today.
        // For accurate comparison, let's query 'leads' where son_arama_zamani is today/yesterday.
        // Note: This only counts UNIQUE customers called. If same customer called twice, it updates timestamp. Acceptable for "Reach" metric.

        const { count: callsToday } = await supabaseAdmin.from('leads').select('id', { count: 'exact', head: true })
            .gte('son_arama_zamani', startOfToday).lte('son_arama_zamani', endOfToday);

        const { count: callsYesterday } = await supabaseAdmin.from('leads').select('id', { count: 'exact', head: true })
            .gte('son_arama_zamani', startOfYesterday).lte('son_arama_zamani', endOfYesterday);

        // B. APPLICATIONS (Başvuru) - Status becomes 'Başvuru alındı' OR created_at is today? 
        // Let's assume Updated to 'Başvuru alındı' OR 'Onay Bekleyen'. 
        // For simplicity and speed: Count leads with status 'Başvuru alındı' updated/created in range.
        const { count: leadsToday } = await supabaseAdmin.from('leads').select('id', { count: 'exact', head: true })
            .or('durum.eq.Başvuru alındı,durum.eq.Onay Bekleniyor,onay_durumu.eq.Onay Bekliyor')
            .gte('updated_at', startOfToday).lte('updated_at', endOfToday);

        const { count: leadsYesterday } = await supabaseAdmin.from('leads').select('id', { count: 'exact', head: true })
            .or('durum.eq.Başvuru alındı,durum.eq.Onay Bekleniyor,onay_durumu.eq.Onay Bekliyor')
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
                target: 100 // Daily Call Target? Or Sales Target? Let's use 100 Calls as mock daily target
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
