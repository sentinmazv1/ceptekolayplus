import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

        // 1. Fetch ALL Sales for this Month (Lightweight)
        const { data: sales, error } = await supabaseAdmin
            .from('leads')
            .select('id, satilan_urunler, teslim_tarihi, onay_tarihi, sahip_email, sehir, dogum_tarihi')
            .or(`durum.eq.Teslim edildi,durum.eq.Satış yapıldı/Tamamlandı,onay_durumu.eq.Onaylandı`)
            .gte('updated_at', startOfMonth); // Optimization: Only look at recently updated

        if (error) throw error;

        // --- PROCESSING ---
        let dailyRevenue = 0;
        let monthlyRevenue = 0;
        let dailySalesCount = 0;
        let monthlySalesCount = 0;
        const recentItems: any[] = [];
        const teamStats: Record<string, { sales: number, revenue: number, name: string, image: string }> = {};
        const cityStats: Record<string, number> = {};
        const ageStats: Record<string, number> = {};

        // Helper to parse currency
        const parsePrice = (p: any) => {
            if (!p) return 0;
            let str = String(p).replace(/[^0-9,.-]/g, '');
            if (str.includes(',') && str.includes('.')) str = str.replace(/\./g, '').replace(',', '.');
            else if (str.includes(',')) str = str.replace(',', '.');
            return parseFloat(str) || 0;
        };

        const seenIds = new Set();

        (sales || []).forEach((lead: any) => {
            // Date Checks
            const saleDate = lead.teslim_tarihi || lead.onay_tarihi;
            if (!saleDate) return;

            const isToday = saleDate >= startOfDay;
            const isThisMonth = saleDate >= startOfMonth;

            if (!isThisMonth) return;

            // Extract Items
            let items: any[] = [];
            try {
                if (typeof lead.satilan_urunler === 'string') items = JSON.parse(lead.satilan_urunler);
                else if (Array.isArray(lead.satilan_urunler)) items = lead.satilan_urunler;
            } catch (e) { }

            // Calculate Revenue from Items
            let leadRevenue = 0;
            if (items.length > 0) {
                items.forEach(item => {
                    const price = parsePrice(item.satis_fiyati || item.fiyat);
                    leadRevenue += price;
                    // Add to recent items list (Limit to last 20 globally later)
                    recentItems.push({
                        name: item.urun_adi || item.marka ? `${item.marka} ${item.model}` : 'Bilinmeyen Ürün',
                        price: price,
                        date: saleDate,
                        user: lead.sahip_email
                    });
                });
            } else {
                // Fallback if no items but valid sale status (Use limit or estimation?)
                // Skipping for accurate "Product Showcase"
            }

            // Aggregates
            monthlyRevenue += leadRevenue;
            monthlySalesCount += items.length > 0 ? items.length : 1;

            if (isToday) {
                dailyRevenue += leadRevenue;
                dailySalesCount += items.length > 0 ? items.length : 1;
            }

            // Team Stats
            const user = lead.sahip_email || 'Unknown';
            if (!teamStats[user]) teamStats[user] = { sales: 0, revenue: 0, name: user.split('@')[0], image: '' };
            teamStats[user].sales += (items.length > 0 ? items.length : 1);
            teamStats[user].revenue += leadRevenue;

            // Analytics (Demographics) - Count LEAD (Customer) once, not items
            if (!seenIds.has(lead.id)) {
                seenIds.add(lead.id);

                // City
                if (lead.sehir) {
                    cityStats[lead.sehir] = (cityStats[lead.sehir] || 0) + 1;
                }

                // Age
                if (lead.dogum_tarihi) {
                    const birthYear = new Date(lead.dogum_tarihi).getFullYear();
                    if (!isNaN(birthYear)) {
                        const age = today.getFullYear() - birthYear;
                        const group = age < 25 ? '18-24' : age < 35 ? '25-34' : age < 45 ? '35-44' : age < 55 ? '45-54' : '55+';
                        ageStats[group] = (ageStats[group] || 0) + 1;
                    }
                }
            }
        });

        // Format for Frontend
        const sortedRecent = recentItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
        const sortedTeam = Object.values(teamStats).sort((a, b) => b.sales - a.sales).slice(0, 5); // Top 5
        const sortedCity = Object.entries(cityStats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, value: count }));
        const sortedAge = Object.entries(ageStats).map(([name, count]) => ({ name, value: count }));

        return NextResponse.json({
            finance: {
                dailyRevenue,
                monthlyRevenue,
                dailySalesCount,
                monthlySalesCount,
                target: 5000000 // Mock Target: 5M TL
            },
            recentSales: sortedRecent,
            team: sortedTeam,
            analytics: {
                city: sortedCity,
                age: sortedAge
            }
        });

    } catch (error: any) {
        console.error('Executive API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
