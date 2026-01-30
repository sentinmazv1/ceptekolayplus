
import { NextRequest, NextResponse } from 'next/server';
import { getReportData, getAllLogs, getInventoryStats, getLeadStats } from '@/lib/leads';

// Helper for Strings
const utcFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

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
        // --- PARAMS ---
        const url = new URL(req.url);
        const todayStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Istanbul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());

        // Date Range: Default to TODAY if not provided
        const startDate = url.searchParams.get('startDate') || todayStr;
        const endDate = url.searchParams.get('endDate') || todayStr;

        // Logs Start: Fetch enough history for goal calculation (7 days ago)
        const headerDate = new Date();
        const historyDate = new Date(headerDate.getTime() - (8 * 24 * 60 * 60 * 1000));
        const historyStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(historyDate);
        const logsStart = startDate < historyStr ? startDate : historyStr;

        // PARALLEL FETCH
        const [customers, logs, inventoryStats, leadStats] = await Promise.all([
            getReportData(startDate, endDate),
            getAllLogs(undefined, logsStart, endDate),
            getInventoryStats(),
            getLeadStats()
        ]);

        if (!customers) {
            return NextResponse.json({ success: true, stats: null, message: "No data found" });
        }

        // --- INIT STATS ---
        const stats = {
            // Financials
            turnover: 0,
            dailyAverage: 0,
            projectedRevenue: 0,

            // Attorney KPI
            attorney: {
                total: 0,
                clean: 0,
                risky: 0,
                unknown: 0
            },

            // Distributions
            city: {} as Record<string, any>,
            profession: {} as Record<string, any>,
            product: {} as Record<string, number>,
            rejection: {} as Record<string, number>,
            status: {} as Record<string, number>,
            channel: {} as Record<string, number>,

            // Demographics
            demographics: {
                cities: {} as Record<string, number>,
                jobs: {} as Record<string, number>,
                ages: {} as Record<string, number>,
                salesByCity: {} as Record<string, number>, // Values in TRY
            },

            // Funnel
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

            // Performance
            performance: {} as Record<string, {
                pulled: number,
                calls: number,
                approvals: number,
                approvedLimit: number,
                applications: number,
                paceMinutes: number,
                sms: number,
                whatsapp: number,
                sales: number,
                salesVolume: number,
                backoffice: number,
                dailyGoal: number,
                image: string
            }>,

            hourly: {} as Record<string, Record<string, Record<number, number>>>,
            inventory: inventoryStats,
            pool: leadStats,
        };

        // Date Timezones
        const TZ_OFFSET = 3 * 60 * 60 * 1000;
        const start = new Date(startDate).getTime() - TZ_OFFSET;
        const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - TZ_OFFSET - 1;

        const isInRange = (dateStr?: string) => {
            if (!dateStr) return false;
            const d = new Date(dateStr).getTime();
            return d >= start && d <= end;
        };

        // Trackers
        const applicationIds = new Set<string>();
        const attorneyQueryIds = new Set<string>();
        const approvedIds = new Set<string>();
        const deliveredIds = new Set<string>();
        const userAppIds: Record<string, Set<string>> = {};

        // --- 1. PROCESS CUSTOMERS ---
        customers.forEach((row: any) => {
            const createdAt = new Date(row.created_at).getTime();
            const createdInRange = createdAt >= start && createdAt <= end;
            const status = row.durum || '';
            const approval = row.onay_durumu || '';
            const owner = row.sahip_email || 'Unknown';

            // A. Demographics (Cohort: Created in Range)
            if (createdInRange) {
                // City
                if (row.sehir) {
                    stats.demographics.cities[row.sehir] = (stats.demographics.cities[row.sehir] || 0) + 1;

                    // Detailed City Stats (Existing Logic)
                    if (!stats.city[row.sehir]) stats.city[row.sehir] = { total: 0, delivered: 0, approved: 0, rejected: 0, cancelled: 0, kefil: 0, noEdevlet: 0, unreachable: 0, other: 0 };
                    stats.city[row.sehir].total++;
                }

                // Job
                const job = row.meslek || row.meslek_is;
                if (job) stats.demographics.jobs[job] = (stats.demographics.jobs[job] || 0) + 1;

                // Age
                // TODO: Parse dogum_tarihi if needed, or stick to simple generic buckets if data is dirty
            }

            // B. Attorney KPIs (Global for range)
            // If lead has attorney query result and was processed in range (check updated_at or created_at)
            // Simplified: If it appears in this report (which implies update/create in range), count it.
            if (row.avukat_sorgu_sonuc) {
                const r = row.avukat_sorgu_sonuc.toUpperCase();
                stats.attorney.total++;
                if (r.includes('TEMİZ') || r.includes('BİZDE KAYDI GÖZÜKMÜYOR')) stats.attorney.clean++;
                else if (r.includes('RİSKLİ') || r.includes('İCRA') || r.includes('SORUNLU')) stats.attorney.risky++;
                else stats.attorney.unknown++;
            }

            // C. Sales & Turnover (Waterfall Date Logic)
            let itemSaleCount = 0;
            let itemRevenue = 0;
            const saleDateStr = row.teslim_tarihi || row.satis_tarihi || (status.includes('Teslim') ? row.updated_at : null);

            if (saleDateStr && isInRange(saleDateStr)) {
                // Calculate Revenue
                // 1. Try satilan_urunler JSON
                try {
                    const products = typeof row.satilan_urunler === 'string' ? JSON.parse(row.satilan_urunler) : row.satilan_urunler;
                    if (Array.isArray(products) && products.length > 0) {
                        products.forEach((p: any) => {
                            itemSaleCount++;
                            itemRevenue += parsePrice(p.satis_fiyati || p.fiyat || 0);
                        });
                    } else {
                        // Fallback Single Logic
                        itemSaleCount = 1;
                        itemRevenue += parsePrice(row.satis_fiyati || row.talep_edilen_tutar || 0);
                        // Note: 'kredi_limiti' is sometimes used as Revenue proxy in legacy, but 'talep_edilen_tutar' or 'fiyat' is better.
                        // Let's stick to parsePrice of specific fields.
                        if (itemRevenue === 0) itemRevenue = parsePrice(row.kredi_limiti || 0);
                    }
                } catch (e) {
                    itemSaleCount = 1;
                    itemRevenue += parsePrice(row.kredi_limiti || 0);
                }
            }

            if (itemSaleCount > 0) {
                stats.turnover += itemRevenue;
                stats.funnel.sale += itemSaleCount;
                stats.funnel.delivered += itemSaleCount;
                stats.funnel.deliveredVolume += itemRevenue;
                deliveredIds.add(row.id);

                // Sales Demographics (Geo-Revenue)
                if (row.sehir) {
                    stats.demographics.salesByCity[row.sehir] = (stats.demographics.salesByCity[row.sehir] || 0) + itemRevenue;
                    if (stats.city[row.sehir]) stats.city[row.sehir].delivered += itemSaleCount;
                }
            }

            // D. Status Distribution (Cohort or Snapshot?)
            // Usually Snapshot of "Current Status of leads touched in this period"
            // If lead is in lists, add status
            if (row.durum) stats.status[row.durum] = (stats.status[row.durum] || 0) + 1;

            // E. Rejections
            if (['Reddetti', 'Uygun değil', 'İptal/Vazgeçti'].includes(status) || approval === 'Reddedildi') {
                let reason = 'Diğer';
                if (approval === 'Reddedildi') reason = 'Yönetici Reddi';
                else if (status === 'Reddetti') reason = 'Müşteri Reddetti';
                else if (status === 'Uygun değil') reason = 'Kriter Dışı';
                if (status === 'İptal/Vazgeçti') reason = row.iptal_nedeni || 'İptal (Nedensiz)';
                stats.rejection[reason] = (stats.rejection[reason] || 0) + 1;
            }
        });


        // --- 2. LOGS PROCESSING (Performance) ---
        // Normalizing Usernames and counting actions (Calls, Apps, etc.)
        logs.forEach((l: any) => {
            const rawUser = l.user_email;
            if (!rawUser) return;
            if (['sistem', 'system', 'admin', 'ibrahim'].some(x => rawUser.toLowerCase().includes(x))) return;

            // Normalize
            let user = rawUser.toLowerCase().trim();
            if (user === 'funda') user = 'funda@ceptekolayplus.com';
            if (user === 'gözde') user = 'gozde@ceptekolayplus.com';

            const ts = new Date(l.timestamp).getTime();
            const action = l.action;

            if (ts >= start && ts <= end) {
                if (!stats.performance[user]) stats.performance[user] = { pulled: 0, calls: 0, approvals: 0, approvedLimit: 0, applications: 0, paceMinutes: 0, sms: 0, whatsapp: 0, sales: 0, salesVolume: 0, backoffice: 0, dailyGoal: 10, image: '' };

                if (action === 'CLICK_CALL') stats.performance[user].calls++;
                else if (action === 'SEND_SMS' || action === 'CLICK_SMS') stats.performance[user].sms++;
                else if (action === 'SEND_WHATSAPP' || action === 'CLICK_WHATSAPP') stats.performance[user].whatsapp++;

                // Application Tracking via Logs (More accurate for timing)
                const val = (l.new_value || '').toLowerCase();
                const validAppStatuses = ['başvuru alındı', 'onaya gönderildi', 'onay bekleniyor', 'onay bekliyor', 'onaya sunuldu', 'eksik evrak bekleniyor'];
                if ((action === 'UPDATE_STATUS' || action === 'CREATED') && validAppStatuses.some(s => val.includes(s))) {
                    if (!userAppIds[user]) userAppIds[user] = new Set();
                    userAppIds[user].add(l.customer_id);
                    stats.performance[user].applications = userAppIds[user].size;
                }
            }
        });

        // Link Sales to Reps (Using Customer Data)
        // We do this loop again or optimize? 
        // We can do it inside the customer loop, checking 'sahip_email' or 'teslim_eden'.
        customers.forEach((row: any) => {
            const saleDateStr = row.teslim_tarihi || row.satis_tarihi || (row.durum?.includes('Teslim') ? row.updated_at : null);
            if (saleDateStr && isInRange(saleDateStr)) {
                const rep = (row.sahip_email || row.teslim_eden || 'Unknown').toLowerCase().trim();
                // Try to match normalized rep
                let user = rep;
                if (user.includes('funda')) user = 'funda@ceptekolayplus.com'; // rudimentary
                if (stats.performance[user]) {
                    // Calculate revenue again (or store it on customer object previously to avoid recalc)
                    let rev = parsePrice(row.satis_fiyati || row.talep_edilen_tutar || row.kredi_limiti || 0);
                    try {
                        const p = JSON.parse(row.satilan_urunler);
                        if (Array.isArray(p)) rev = p.reduce((acc, curr) => acc + parsePrice(curr.fiyat || curr.satis_fiyati || 0), 0);
                    } catch (e) { }

                    stats.performance[user].sales++;
                    stats.performance[user].salesVolume += rev;
                }
            }
        });


        // --- 3. FINAL CALCULATIONS ---

        // Projections
        const daysInMonth = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0).getDate();
        // Days Elapsed: If current month, use today's day. If past month, use total days.
        const reportMonth = new Date(startDate).getMonth();
        const currentMonth = new Date().getMonth();
        let daysElapsed = 0;

        if (reportMonth === currentMonth) {
            daysElapsed = new Date().getDate();
        } else {
            daysElapsed = daysInMonth;
        }

        stats.dailyAverage = stats.turnover / Math.max(daysElapsed, 1);
        stats.projectedRevenue = stats.dailyAverage * daysInMonth;


        return NextResponse.json({ success: true, stats });

    } catch (error: any) {
        console.error('Reports Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
