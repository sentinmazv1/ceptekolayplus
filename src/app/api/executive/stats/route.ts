import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        try {
            // --- TIMEZONE FIX: EUROPE/ISTANBUL ---
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Europe/Istanbul',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            // Parts of "Today" in TR Time
            const parts = formatter.formatToParts(now);
            const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
            const year = parseInt(getPart('year'));
            const month = parseInt(getPart('month')) - 1; // JS month is 0-indexed
            const day = parseInt(getPart('day'));

            // CALCULATE BOUNDARIES MANUALLY TO ENSURE TR TIME
            // 1. Start of Today (TR)
            // Create a date that IS today 00:00:00 in TR, then get ISO String.
            // Best way: Use string construction for ISO-like comparison if DB is UTC, 
            // BUT Supabase 'timestamptz' handles compare automatically if we send valid ISO with offset?
            // Actually, easiest is to construct UTC dates that correspond to TR midnight.
            // TR is UTC+3. So Midnight TR = 21:00 UTC previous day.

            const trOffset = 3 * 60 * 60 * 1000;

            // Today 00:00 TR
            const todayTR = new Date(Date.UTC(year, month, day, 0, 0, 0));
            todayTR.setTime(todayTR.getTime() - trOffset); // Shift back to UTC representation of TR midnight

            const startOfToday = todayTR.toISOString();
            const endOfToday = new Date(todayTR.getTime() + (24 * 60 * 60 * 1000) - 1).toISOString();

            // Yesterday 00:00 TR
            const yesterdayTR = new Date(todayTR.getTime() - (24 * 60 * 60 * 1000));
            const startOfYesterday = yesterdayTR.toISOString();
            const endOfYesterday = new Date(yesterdayTR.getTime() + (24 * 60 * 60 * 1000) - 1).toISOString();

            // Start of Month TR
            const monthTR = new Date(Date.UTC(year, month, 1, 0, 0, 0));
            monthTR.setTime(monthTR.getTime() - trOffset);
            const startOfMonth = monthTR.toISOString();


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
