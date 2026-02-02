
import { NextRequest, NextResponse } from 'next/server';
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

const normalizeUser = (u: string) => {
    if (!u) return 'Unknown';
    let norm = u.toLowerCase().trim();
    if (norm.includes('funda')) return 'funda@ceptekolayplus.com';
    if (norm.includes('gözde') || norm.includes('gozde')) return 'gozde@ceptekolayplus.com';
    return norm; // Return email as is
};

const classifyRisk = (result: string | null): 'Clean' | 'Risky' | 'Unknown' => {
    if (!result) return 'Unknown';
    const r = result.toUpperCase();
    if (r.includes('TEMİZ') || r.includes('BİZDE KAYDI GÖZÜKMÜYOR') || r.includes('SORGU TEMİZ')) return 'Clean';
    return 'Risky';
};

// --- MAIN HANDLER ---
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, message: 'Start and End dates are required' }, { status: 400 });
        }

        // Adjust Dates for DB Query (UTC)
        // We assume input is YYYY-MM-DD (Turkey Time implied). 
        // We need to cover the FULL days in Turkey Time (UTC+3).
        // 00:00 TRT = Prev Day 21:00 UTC.
        // 23:59 TRT = Today 20:59 UTC.
        // For safety, we'll fetch a slightly wider UTC window and filter precisely in JS if needed, 
        // OR just use the string comparison if columns are timestamptz.
        const startIso = `${startDate}T00:00:00.000+03:00`;
        const endIso = `${endDate}T23:59:59.999+03:00`;

        // 1. FETCH DATA (Parallel)

        // A. Leads (Created or Updated in range)
        // We need leads relevant to this period. 
        // "Updated At" approach is good for capturing activity.
        const { data: leadsData, error: leadsError } = await supabaseAdmin
            .from('leads')
            .select('*')
            .or(`created_at.gte.${startIso},updated_at.gte.${startIso}`) // Fetch anything touched recently
        // Note: This might miss leads created months ago but sold today if updated_at wasn't touched? 
        // Usually 'durum' change updates updated_at.
        // Safe bet: Fetch sales separately like Executive Dashboard to be 100% sure.

        if (leadsError) throw leadsError;

        // B. Logs (Activity)
        // Fetch logs for this period (+ 7 days history for goals if we want dynamic goals, currently we'll stick to fixed goals or simple avg)
        const historyStart = new Date(new Date(startIso).getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString();

        const { data: logsData, error: logsError } = await supabaseAdmin
            .from('activity_logs')
            .select('user_email, action, timestamp, lead_id, new_value, note, old_value')
            .gte('timestamp', historyStart)
            .lte('timestamp', endIso);

        if (logsError) throw logsError;

        // C. Inventory
        const { data: inventoryData } = await supabaseAdmin
            .from('inventory')
            .select('marka, model, durum, satis_fiyati, maliyet_fiyati');


        // --- INIT STATS ---
        const stats = {
            city: {} as Record<string, any>,
            profession: {} as Record<string, any>,
            product: {} as Record<string, number>,
            rejection: {} as Record<string, number>,
            status: {} as Record<string, number>,
            channel: {} as Record<string, number>,
            daily: {} as Record<string, number>,
            funnel: {
                totalCalled: 0,
                uniqueCalled: 0,
                applications: 0,
                attorneyQueries: 0,
                attorneyPending: 0,
                attorneyClean: 0,
                attorneyRisky: 0,
                attorneyApproved: 0,
                attorneyRejected: 0,
                approved: 0,
                approvedLimit: 0,
                delivered: 0,
                deliveredVolume: 0,
                sale: 0,
            },
            performance: {} as Record<string, any>,
            hourly: {} as Record<string, Record<string, Record<number, number>>>,
            inventory: {
                totalItems: 0,
                totalCost: 0,
                totalRevenue: 0
            }
        };

        const leads = leadsData || [];
        const logs = logsData || [];
        const inventory = inventoryData || [];

        // Helper: Date Check
        const startTs = new Date(startIso).getTime();
        const endTs = new Date(endIso).getTime();
        const isInRange = (d: string | null) => {
            if (!d) return false;
            const t = new Date(d).getTime();
            return t >= startTs && t <= endTs;
        };


        // --- PROCESS INVENTORY ---
        inventory.forEach((item: any) => {
            if (item.durum === 'STOKTA') {
                stats.inventory.totalItems++;
                stats.inventory.totalCost += parsePrice(item.maliyet_fiyati);
                stats.inventory.totalRevenue += parsePrice(item.satis_fiyati);
            }
        });


        // --- PROCESS LOGS (Performance, Hourly, Funnel Actions) ---
        const userStats: Record<string, any> = {};
        const getOrCreateUser = (u: string) => {
            const user = normalizeUser(u);
            if (!userStats[user]) {
                userStats[user] = {
                    pulled: 0, calls: 0, approvals: 0, approvedLimit: 0,
                    applications: 0, paceMinutes: 0, sms: 0, whatsapp: 0,
                    sales: 0, salesVolume: 0, backoffice: 0, dailyGoal: 40, image: ''
                };
            }
            return user;
        };

        const processedLogIds = new Set(); // For unique attorney queries logic if needed
        const attorneyQuerySet = new Set<string>();

        // Helper to track 7-day history for goals
        const userPastCalls: Record<string, number> = {};

        // Sort logs for Pace calculation
        logs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Pace Helpers
        const userLogTimes: Record<string, number[]> = {};

        logs.forEach((log: any) => {
            const ts = new Date(log.timestamp).getTime();
            const rawUser = log.user_email;
            if (!rawUser || ['sistem'].some(x => rawUser.toLowerCase().includes(x))) return;

            const user = getOrCreateUser(rawUser);

            // Goals History (Last 7 Days before Start Date)
            if (ts < startTs) {
                if (log.action === 'CLICK_CALL') {
                    userPastCalls[user] = (userPastCalls[user] || 0) + 1;
                }
                return;
            }

            // --- REPORT RANGE LOGS ---
            if (ts >= startTs && ts <= endTs) {
                // Pace Capturing
                if (!userLogTimes[user]) userLogTimes[user] = [];
                userLogTimes[user].push(ts);

                // Hourly Heatmap
                // Fix: Ensure Turkey Time for hourly distribution
                const trDate = new Date(new Date(log.timestamp).toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
                const trHour = trDate.getHours();
                const trDateKey = trDate.toISOString().split('T')[0];

                if (!stats.hourly[trDateKey]) stats.hourly[trDateKey] = {};
                if (!stats.hourly[trDateKey][user]) stats.hourly[trDateKey][user] = {};

                stats.hourly[trDateKey][user][trHour] = (stats.hourly[trDateKey][user][trHour] || 0) + 1;

                // Actions
                if (log.action === 'PULL_LEAD') userStats[user].pulled++;
                if (log.action === 'CLICK_CALL') {
                    userStats[user].calls++;
                    stats.funnel.totalCalled++;
                }
                if (log.action === 'SEND_SMS' || log.action === 'CLICK_SMS') userStats[user].sms++;
                if (log.action === 'SEND_WHATSAPP' || log.action === 'CLICK_WHATSAPP') userStats[user].whatsapp++;

                // Attorney Queries (Unique by Lead ID)
                const isAttorney = (log.new_value && String(log.new_value).match(/avukat|sorgu/i)) || (log.note && String(log.note).match(/avukat|sorgu/i));
                if (isAttorney && (log.action === 'UPDATE_FIELDS' || log.action === 'UPDATE_STATUS')) {
                    if (!attorneyQuerySet.has(log.lead_id)) {
                        attorneyQuerySet.add(log.lead_id);
                        stats.funnel.attorneyQueries++;

                        const val = String(log.new_value || '');
                        if (val.includes('Temiz')) stats.funnel.attorneyClean++;
                        else if (val.includes('Riskli')) stats.funnel.attorneyRisky++;
                    }
                }
            }
        });

        // Finalize Goals
        Object.keys(userStats).forEach(u => {
            // Avg per day over 7 days. If 0, default to 40.
            const pastTotal = userPastCalls[u] || 0;
            const dailyAvg = Math.ceil(pastTotal / 7);
            userStats[u].dailyGoal = dailyAvg > 0 ? Math.ceil(dailyAvg * 1.1) : 40; // +10% Stretch Goal
        });

        // Calculate Pace
        Object.keys(userLogTimes).forEach(u => {
            const times = userLogTimes[u];
            let totalGap = 0, gapCount = 0;
            for (let i = 1; i < times.length; i++) {
                const diff = times[i] - times[i - 1];
                if (diff < 60 * 60 * 1000) { // Igore gaps > 1 hour (lunch/break)
                    totalGap += diff;
                    gapCount++;
                }
            }
            if (gapCount > 0) {
                userStats[u].paceMinutes = Math.round((totalGap / gapCount) / 60000);
            }
        });


        // --- PROCESS LEADS (Status, Sales, Demographics) ---
        leads.forEach((lead: any) => {
            const owner = normalizeUser(lead.sahip_email || lead.sahip || '');
            const isTrackedUser = owner && userStats[owner]; // Only count for active staff

            // 1. Status Stats (Snapshot)
            if (lead.durum) {
                stats.status[lead.durum] = (stats.status[lead.durum] || 0) + 1;
            }

            // 2. City
            if (lead.sehir) {
                if (!stats.city[lead.sehir]) stats.city[lead.sehir] = { total: 0, delivered: 0, approved: 0, rejected: 0, cancelled: 0, kefil: 0, sr: 0, other: 0 };
                stats.city[lead.sehir].total++;
                if (lead.durum === 'Teslim edildi') stats.city[lead.sehir].delivered++;
                else if (lead.onay_durumu === 'Onaylandı') stats.city[lead.sehir].approved++;
                else if (lead.durum?.includes('Red') || lead.onay_durumu?.includes('Red')) stats.city[lead.sehir].rejected++;
            }

            // 3. Funnel & Sales (Date Based)

            // Unique Called
            if (isInRange(lead.son_arama_zamani)) {
                stats.funnel.uniqueCalled++;
            }

            // Applications (Created In Range AND meaningful status OR Updated to meaningful status)
            // For Report, we usually count "Applications Generated", i.e. Created Date.
            // If user wants "Applications Processed", we'd use updated_at + Status Check.
            // Let's stick to Created At for "New Applications"
            const isApp = ['Başvuru alındı', 'Kefil bekleniyor', 'Onaylandı', 'Teslim edildi', 'Reddedildi'].includes(lead.durum) || lead.onay_durumu === 'Onaylandı';
            if (isInRange(lead.created_at) && isApp) {
                stats.funnel.applications++;
                if (isTrackedUser) userStats[owner].applications++;
            }

            // Approvals
            if (lead.onay_durumu === 'Onaylandı' && isInRange(lead.onay_tarihi)) {
                stats.funnel.approved++;
                const limit = parsePrice(lead.kredi_limiti);
                stats.funnel.approvedLimit += limit;

                if (isTrackedUser) {
                    userStats[owner].approvals++;
                    userStats[owner].approvedLimit += limit;
                }
            }

            // Sales / Delivered
            const saleDate = lead.teslim_tarihi || lead.satis_tarihi;
            const isSold = ['Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Satış Yapıldı'].includes(lead.durum);

            if (isSold && isInRange(saleDate)) {
                stats.funnel.delivered++;

                // Revenue Calc
                let revenue = 0;
                try {
                    // Try Parsing Items
                    if (lead.satilan_urunler && Array.isArray(lead.satilan_urunler)) {
                        lead.satilan_urunler.forEach((p: any) => revenue += parsePrice(p.satis_fiyati || p.fiyat));
                    }
                } catch (e) { }

                if (revenue === 0) revenue = parsePrice(lead.kredi_limiti || lead.satis_fiyati || lead.talep_edilen_tutar);

                stats.funnel.deliveredVolume += revenue;
                stats.funnel.sale++; // Single Lead Scale

                if (isTrackedUser) {
                    userStats[owner].sales++;
                    userStats[owner].salesVolume += revenue;
                }
            }

            // Rejections
            if (['Reddetti', 'Uygun değil', 'İptal/Vazgeçti', 'Reddedildi'].includes(lead.durum)) {
                const reason = lead.iptal_nedeni || lead.durum;
                if (isInRange(lead.updated_at)) { // Only count recent rejections
                    stats.rejection[reason] = (stats.rejection[reason] || 0) + 1;
                }
            }

        });

        stats.performance = userStats;

        return NextResponse.json({ success: true, stats });

    } catch (error: any) {
        console.error('Reports V2 Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
