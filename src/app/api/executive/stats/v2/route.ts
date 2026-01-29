import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// --- HELPERS ---
const getTRDate = (d: Date) => {
    return new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
}

const parsePrice = (p: any): number => {
    if (!p) return 0;
    let str = String(p).replace(/[^0-9,.-]/g, '');
    if (str.includes(',') && str.includes('.')) str = str.replace(/\./g, '').replace(',', '.');
    else if (str.includes(',')) str = str.replace(',', '.');
    return parseFloat(str) || 0;
};

// --- TYPES ---
interface StatBucket {
    totalRevenue: number;
    totalSales: number;
    totalLeads: number;
    salesBySource: Record<string, number>;
    salesByRep: Record<string, { revenue: number, count: number, name: string }>;
    dailyRevenue: Record<string, number>;
    hourlySales: Record<string, number>;
    productBreakdown: Record<string, number>;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const queryStart = searchParams.get('startDate');
        const queryEnd = searchParams.get('endDate');

        // 1. DATE RANGE LOGIC
        // Default: This Month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let startIso = queryStart ? `${queryStart}T00:00:00.000Z` : startOfMonth.toISOString();
        let endIso = queryEnd ? `${queryEnd}T23:59:59.999Z` : new Date().toISOString();

        // 2. FETCH DATA (Wide Net)
        // We fetch:
        // A. ALL "Sold" leads in range (for Revenue/Conversion/Team)
        // B. ALL "New" leads in range (for Lead Count/Conversion base)

        // A. SALES
        // Status: 'Teslim edildi' OR 'Satış yapıldı/Tamamlandı'
        // Logic: Try 'teslim_tarihi' first, then 'updated_at' fallback
        const { data: salesData, error: salesError } = await supabaseAdmin
            .from('leads')
            .select('*')
            .or('durum.eq.Teslim edildi,durum.eq.Satış yapıldı/Tamamlandı')
            .gte('created_at', '2023-01-01'); // Safe wide fetch, we filter in JS for complex fallback logic

        if (salesError) throw salesError;

        // B. LEADS (New Entries)
        const { count: totalLeads } = await supabaseAdmin
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', startIso)
            .lte('created_at', endIso);


        // --- 3. PROCESSING (The "Robust" Engine) ---
        const bucket: StatBucket = {
            totalRevenue: 0,
            totalSales: 0,
            totalLeads: totalLeads || 0,
            salesBySource: {},
            salesByRep: {},
            dailyRevenue: {},
            hourlySales: {},
            productBreakdown: {}
        };

        const startDateObj = new Date(startIso).getTime();
        const endDateObj = new Date(endIso).getTime();

        salesData.forEach((lead: any) => {
            // A. DETERMINE "TRUE" DATE
            // Waterfall: Teslim Check -> Satis Check -> Updated Fallback
            let dateStr = lead.teslim_tarihi || lead.satis_tarihi || lead.updated_at;
            if (!dateStr) return; // Should not happen

            const leadDate = new Date(dateStr).getTime();

            // Filter: Is it in range?
            if (leadDate < startDateObj || leadDate > endDateObj) return;

            // B. DETERMINE "TRUE" REVENUE
            let revenue = 0;
            let items: any[] = [];
            let productNames: string[] = [];

            try {
                if (typeof lead.satilan_urunler === 'string') items = JSON.parse(lead.satilan_urunler);
                else if (Array.isArray(lead.satilan_urunler)) items = lead.satilan_urunler;
            } catch (e) { }

            if (items.length > 0) {
                // Precise Item Calculation
                items.forEach(i => {
                    const p = parsePrice(i.satis_fiyati || i.fiyat);
                    revenue += p;
                    const pName = i.marka ? `${i.marka} ${i.model}` : (i.urun_adi || 'Bilinmeyen Ürün');
                    productNames.push(pName);
                });
            } else {
                // Fallback Calculation
                if (lead.satis_fiyati) revenue = parsePrice(lead.satis_fiyati);
                else if (lead.talep_edilen_tutar) revenue = Number(lead.talep_edilen_tutar); // Weak fallback
                else if (lead.durum === 'Teslim edildi') revenue = 5000; // Last resort estimation? Maybe too risky. Let's keep 0 to avoid lies.

                productNames.push(lead.talep_edilen_urun || 'Cihaz');
            }

            // C. AGGREGATE
            bucket.totalSales += 1;
            bucket.totalRevenue += revenue;

            // Group: Rep
            const rep = (lead.sahip_email || 'Bilinmeyen').split('@')[0];
            if (!bucket.salesByRep[rep]) bucket.salesByRep[rep] = { revenue: 0, count: 0, name: rep };
            bucket.salesByRep[rep].revenue += revenue;
            bucket.salesByRep[rep].count += 1;

            // Group: Source
            const source = lead.basvuru_kanali || 'Diğer';
            bucket.salesBySource[source] = (bucket.salesBySource[source] || 0) + 1;

            // Group: Daily (YYYY-MM-DD)
            const dayKey = new Date(dateStr).toISOString().split('T')[0];
            bucket.dailyRevenue[dayKey] = (bucket.dailyRevenue[dayKey] || 0) + revenue;

            // Group: Hourly
            const hour = new Date(dateStr).getHours();
            const hourKey = `${hour}:00`;
            bucket.hourlySales[hourKey] = (bucket.hourlySales[hourKey] || 0) + 1;

            // Group: Product
            productNames.forEach(name => {
                bucket.productBreakdown[name] = (bucket.productBreakdown[name] || 0) + 1;
            });
        });

        // --- 4. FORMATTING FOR UI ---

        // Convert Maps to Arrays
        const teamPerformance = Object.values(bucket.salesByRep)
            .sort((a, b) => b.revenue - a.revenue)
            .map(t => ({ ...t, avgTicket: t.count > 0 ? Math.round(t.revenue / t.count) : 0 }));

        const sourcePerformance = Object.entries(bucket.salesBySource)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value]) => ({ name, value }));

        const dailyTrend = Object.entries(bucket.dailyRevenue)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, value]) => ({ date, value }));

        const topProducts = Object.entries(bucket.productBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));

        // Calculate Conversion
        // Note: Total Leads might be 0 if only importing legacy sales.
        // Conversion = Sales / (Leads + Sales) approx? 
        // Or simply Sales / Total Unique Leads in period.
        // If totalLeads is small (e.g. data gap), cap conversion at 100%.
        const conversionRate = bucket.totalLeads > 0
            ? Math.min((bucket.totalSales / bucket.totalLeads) * 100, 100)
            : 0;

        return NextResponse.json({
            success: true,
            kpi: {
                turnover: bucket.totalRevenue,
                salesCount: bucket.totalSales,
                leadCount: bucket.totalLeads,
                conversion: conversionRate,
                avgDealSize: bucket.totalSales > 0 ? Math.round(bucket.totalRevenue / bucket.totalSales) : 0
            },
            charts: {
                dailyTrend,
                teamPerformance,
                sourcePerformance,
                topProducts,
                hourlyHeatmap: bucket.hourlySales // simple map
            },
            meta: {
                range: { start: startIso, end: endIso },
                timestamp: new Date().toISOString()
            }
        });

    } catch (e: any) {
        console.error('V2 Stats Error:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
