import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// --- HELPERS ---
const parsePrice = (p: any): number => {
    if (!p) return 0;
    let str = String(p).replace(/[^0-9,.-]/g, '');
    if (str.includes(',') && str.includes('.')) str = str.replace(/\./g, '').replace(',', '.');
    else if (str.includes(',')) str = str.replace(',', '.');
    return parseFloat(str) || 0;
};

const classifyRisk = (result: string | null): 'Clean' | 'Risky' | 'Unknown' => {
    if (!result) return 'Unknown';
    const r = result.toUpperCase();
    if (r.includes('TEMİZ') || r.includes('BİZDE KAYDI GÖZÜKMÜYOR') || r.includes('SORGU TEMİZ')) return 'Clean';
    return 'Risky';
};

// --- TYPES ---
interface Lead {
    id: string;
    created_at: string;
    durum: string;
    avukat_sorgu_sonuc: string | null;
    avukat_sorgu_durumu: string | null;
    onay_durumu: string | null;
    meslek: string | null;
    meslek_is: string | null;
    sehir: string | null;
    dogum_tarihi: string | null;
    maas_ortalama: string | number | null;
    satilan_urunler: any;
    satis_fiyati: any;
    talep_edilen_tutar: any;
    teslim_tarihi: string | null;
    satis_tarihi: string | null;
    updated_at: string;
    sahip_email: string | null;
    basvuru_kanali: string | null;
    urun_adi?: string;
    marka?: string;
    model?: string;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const queryStart = searchParams.get('startDate'); // User selected start
        const queryEnd = searchParams.get('endDate');     // User selected end

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfToday = new Date().toISOString();

        // Use filtered range for "Daily Performance", but "StartOfMonth" for "General/Monthly" view
        // To be efficient, we might fetch everything from the earliest date needed.
        // If user selects "Yesterday", earliest is StartOfMonth (for Monthly View).
        // If user selects "Last Year", earliest is QueryStart.

        const filterStartIso = queryStart ? `${queryStart}T00:00:00.000Z` : startOfMonth;
        const filterEndIso = queryEnd ? `${queryEnd}T23:59:59.999Z` : endOfToday;

        const earliestDate = filterStartIso < startOfMonth ? filterStartIso : startOfMonth;
        const latestDate = filterEndIso > endOfToday ? filterEndIso : endOfToday;

        // 1. FETCH EVERYTHING (Optimized)

        // A. LEADS (For Funnel, Demographics, Sales)
        // Fetching "Risk" indicators and "Demographic" fields
        const { data: leadsData, error: leadsError } = await supabaseAdmin
            .from('leads')
            .select('id, created_at, durum, avukat_sorgu_sonuc, avukat_sorgu_durumu, onay_durumu, meslek, meslek_is, sehir, dogum_tarihi, maas_ortalama, satilan_urunler, satis_fiyati, talep_edilen_tutar, teslim_tarihi, satis_tarihi, updated_at, sahip_email, basvuru_kanali')
            .gte('created_at', earliestDate); // Fetch from earliest needed

        if (leadsError) throw leadsError;

        // B. LOGS (For Staff Performance & Ops)
        // We filter logs strictly by the Filtered Range (Daily View context) to save bandwidth
        // But user might want "Monthly Staff Performance"? 
        // Request said: "Daily detail... staff scorecards".
        // Let's fetch logs for the Filtered Range only.
        const { data: logsData, error: logsError } = await supabaseAdmin
            .from('activity_logs')
            .select('user_email, action, timestamp, user_id') // Added user_email
            .gte('timestamp', filterStartIso)
            .lte('timestamp', filterEndIso);

        if (logsError) throw logsError;

        // C. INVENTORY (Snapshot - independent of date)
        const { data: inventoryData } = await supabaseAdmin
            .from('inventory')
            .select('marka, model, durum, satis_fiyati');


        // --- PROCESSING ---

        // BUCKETS
        const monthly = {
            turnover: 0,
            salesCount: 0,
            leadCount: 0, // Total Applications/Leads this month
            funnel: {
                leads: 0,
                applications: 0, // Has query status
                attorneyChecks: 0,  // Has query result
                clean: 0,
                risky: 0,
                approved: 0,
                delivered: 0
            },
            demographics: {
                cities: {} as Record<string, number>,
                jobs: {} as Record<string, number>,
                ages: {} as Record<string, number>,
                incomes: {} as Record<string, number>
            }
        };

        const filtered = {
            salesByRep: {} as Record<string, { revenue: number, count: number, name: string }>,
            logsByRep: {} as Record<string, { calls: number, sms: number, whatsapp: number, total: number, name: string }>,
            dailyTrend: {} as Record<string, number>, // Revenue trend
            ops: {
                calls: 0,
                sms: 0,
                whatsapp: 0
            }
        };

        const leads = (leadsData as Lead[]) || [];
        const logs = logsData || [];

        // 2. PROCESS LEADS (Monthly & Demographics)
        leads.forEach(lead => {
            const createdAt = new Date(lead.created_at).getTime();
            const startMonthTime = new Date(startOfMonth).getTime();

            // IS IN CURRENT MONTH?
            const isThisMonth = createdAt >= startMonthTime;

            if (isThisMonth) {
                monthly.leadCount++;

                // Funnel
                monthly.funnel.leads++;
                if (lead.avukat_sorgu_durumu || lead.avukat_sorgu_sonuc) monthly.funnel.applications++;
                if (lead.avukat_sorgu_sonuc) {
                    monthly.funnel.attorneyChecks++;
                    const risk = classifyRisk(lead.avukat_sorgu_sonuc);
                    if (risk === 'Clean') monthly.funnel.clean++;
                    else if (risk === 'Risky') monthly.funnel.risky++;
                }
                if (lead.onay_durumu === 'Onaylandı') monthly.funnel.approved++;
                if (lead.durum === 'Teslim edildi' || lead.durum === 'Satış Yapıldı' || lead.durum === 'Satış yapıldı/Tamamlandı') monthly.funnel.delivered++;

                // Demographics (All leads this month)
                if (lead.sehir) monthly.demographics.cities[lead.sehir] = (monthly.demographics.cities[lead.sehir] || 0) + 1;

                const job = lead.meslek || lead.meslek_is;
                if (job) monthly.demographics.jobs[job] = (monthly.demographics.jobs[job] || 0) + 1;

                // Age calc
                /* 
                   Date formats vary nicely in dirty data.. 
                   Assuming YYYY-MM-DD or ignoring if invalid
                */
                // For now, let's skip complex age parsing to avoid errors, or try simple ISO check
            }

            // SALES PROCESSING (For Turnover & Rep Performance)
            // Use Waterfall Date Logic
            const saleDateStr = lead.teslim_tarihi || lead.satis_tarihi || (lead.durum.includes('Teslim') ? lead.updated_at : null);

            if (saleDateStr) {
                const saleDate = new Date(saleDateStr).getTime();
                let revenue = parsePrice(lead.satis_fiyati || lead.talep_edilen_tutar || 0);
                // Hard fix for empty revenue on delivered items logic can be added here

                // Monthly Turnover (Fixed Scope)
                if (saleDate >= startMonthTime) {
                    monthly.turnover += revenue;
                    monthly.salesCount++;
                }

                // Filtered Range (Daily View Scope)
                const filterStart = new Date(filterStartIso).getTime();
                const filterEnd = new Date(filterEndIso).getTime();

                if (saleDate >= filterStart && saleDate <= filterEnd) {
                    // Rep Stats
                    const rep = (lead.sahip_email || 'Bilinmeyen').split('@')[0];
                    if (!filtered.salesByRep[rep]) filtered.salesByRep[rep] = { revenue: 0, count: 0, name: rep };
                    filtered.salesByRep[rep].revenue += revenue;
                    filtered.salesByRep[rep].count++;

                    // Daily Trend
                    const dayKey = new Date(saleDateStr).toISOString().split('T')[0];
                    filtered.dailyTrend[dayKey] = (filtered.dailyTrend[dayKey] || 0) + revenue;
                }
            }
        });


        // 3. PROCESS LOGS (Staff Scorecards - Filtered Range)
        logs.forEach(log => {
            const rep = (log.user_email || 'Sistem').split('@')[0];

            if (!filtered.logsByRep[rep]) filtered.logsByRep[rep] = { calls: 0, sms: 0, whatsapp: 0, total: 0, name: rep };

            const action = log.action;
            if (action === 'CLICK_CALL') {
                filtered.logsByRep[rep].calls++;
                filtered.ops.calls++;
            }
            if (action === 'SEND_SMS' || action === 'CLICK_SMS') {
                filtered.logsByRep[rep].sms++;
                filtered.ops.sms++;
            }
            if (action === 'SEND_WHATSAPP' || action === 'CLICK_WHATSAPP') {
                filtered.logsByRep[rep].whatsapp++;
                filtered.ops.whatsapp++;
            }
            filtered.logsByRep[rep].total++;
        });

        // 4. INVENTORY STATS
        const stockStats = {
            total: 0,
            value: 0,
            topModels: [] as any[]
        };
        const modelCounts: Record<string, number> = {};

        (inventoryData || []).forEach((item: any) => {
            if (item.durum === 'STOKTA') {
                stockStats.total++;
                stockStats.value += parsePrice(item.satis_fiyati);
                const name = `${item.marka} ${item.model}`;
                modelCounts[name] = (modelCounts[name] || 0) + 1;
            }
        });

        stockStats.topModels = Object.entries(modelCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));


        // 5. FORMAT RESPONSE
        // Monthly Projections
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysElapsed = now.getDate();
        const dailyAvg = monthly.turnover / Math.max(daysElapsed, 1);
        const projected = dailyAvg * daysInMonth;

        return NextResponse.json({
            success: true,
            monthly: {
                ...monthly,
                projectedRevenue: projected,
                dailyAverage: dailyAvg,
                demographics: {
                    cities: Object.entries(monthly.demographics.cities).sort((a, b) => b[1] - a[1]).slice(0, 8),
                    jobs: Object.entries(monthly.demographics.jobs).sort((a, b) => b[1] - a[1]).slice(0, 8),
                }
            },
            filtered: {
                trend: Object.entries(filtered.dailyTrend).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date)),
                staff: Object.values(filtered.logsByRep).map(logStart => {
                    const sales = filtered.salesByRep[logStart.name] || { revenue: 0, count: 0 };
                    return {
                        name: logStart.name,
                        calls: logStart.calls,
                        sms: logStart.sms,
                        whatsapp: logStart.whatsapp,
                        salesCount: sales.count,
                        revenue: sales.revenue,
                        efficiency: (sales.count / Math.max(logStart.total, 1)) * 100 // Sales per Interaction %
                    };
                }).sort((a, b) => b.revenue - a.revenue),
                ops: filtered.ops
            },
            inventory: stockStats,
            meta: {
                filterStart: filterStartIso,
                filterEnd: filterEndIso
            }
        });

    } catch (e: any) {
        console.error('V3 Stats Error:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
