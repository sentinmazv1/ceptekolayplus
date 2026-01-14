
import { NextRequest, NextResponse } from 'next/server';
import { getReportData, getAllLogs } from '@/lib/leads';

// Helper using Intl for robustness
const trFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

// Helper for Strings
const utcFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // --- PARAMS ---
        const url = new URL(req.url);
        const todayStr = trFormatter.format(new Date());

        // Date Range: Default to TODAY if not provided
        const startDate = url.searchParams.get('startDate') || todayStr;
        const endDate = url.searchParams.get('endDate') || todayStr;

        const [customers, logs] = await Promise.all([
            getReportData(),
            getAllLogs()
        ]);

        if (!customers || customers.length === 0) {
            return NextResponse.json({ success: true, stats: null, message: "No data found" });
        }

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
                approved: 0,
                approvedLimit: 0,
                delivered: 0,
                sale: 0,
            },
            performance: {} as Record<string, {
                calls: number,
                approvals: number,
                approvedLimit: number,
                applications: number,
                paceMinutes: number,
                sms: number,
                whatsapp: number,
                dailyGoal: number,
                image: string
            }>,
            hourly: {} as Record<string, Record<string, Record<number, number>>>,
        };

        // Date Helpers
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1;

        // Helper: Check if date string is in range
        const isInRange = (dateStr?: string) => {
            if (!dateStr) return false;
            const d = new Date(dateStr).getTime();
            return d >= start && d <= end;
        };

        // --- TRACKING SETS (Unique IDs to prevent double counting) ---
        const applicationIds = new Set<string>();
        const attorneyQueryIds = new Set<string>();
        const approvedIds = new Set<string>();
        const deliveredIds = new Set<string>();
        const userAppIds: Record<string, Set<string>> = {}; // User -> Set<LeadID>

        // --- 1. PROCESS LOGS (Activity Flow) ---
        // Puts "Events" into buckets
        logs.forEach((l: any) => {
            const user = l.user_email;
            if (!user) return;
            if (['sistem', 'system', 'admin', 'ibrahim', 'ibrahimsentinmaz@gmail.com'].some(x => user.toLowerCase().includes(x))) return;

            const ts = new Date(l.timestamp).getTime();
            const action = l.action;

            if (ts >= start && ts <= end) {
                // Init Perf
                if (!stats.performance[user]) stats.performance[user] = { calls: 0, approvals: 0, approvedLimit: 0, applications: 0, paceMinutes: 0, sms: 0, whatsapp: 0, dailyGoal: 0, image: '' };
                if (!userAppIds[user]) userAppIds[user] = new Set();

                // Calls
                if (action === 'PULL_LEAD') stats.performance[user].calls++;
                if (action === 'SEND_SMS') stats.performance[user].sms++;
                if (action === 'SEND_WHATSAPP') stats.performance[user].whatsapp++;

                // Applications (Log Source)
                if (action === 'UPDATE_STATUS' && l.new_value === 'Başvuru alındı') {
                    applicationIds.add(l.customer_id);
                    userAppIds[user].add(l.customer_id);
                }

                // Attorney Queries (Log Source)
                if ((action === 'UPDATE_FIELDS' && l.new_value && l.new_value.match(/avukat|sorgu/i)) ||
                    (action === 'UPDATE_STATUS' && l.new_value && l.new_value.match(/avukat/i))) {
                    attorneyQueryIds.add(l.customer_id);
                }
            }
        });

        // --- 2. PROCESS CUSTOMERS (Snapshots & Fallbacks) ---
        customers.forEach((row: any) => {
            const approvalDate = row.onay_tarihi;
            const callDate = row.son_arama_zamani;
            const status = row.durum;
            const approval = row.onay_durumu;
            const owner = row.sahip || row.sahip_email;

            // SKIP ignored users (for performance only, but keep for global funnel if relevant?)
            // Let's attribute everything to owner if available
            const isTrackedUser = owner && !['sistem', 'system', 'admin', 'ibrahim', 'ibrahimsentinmaz@gmail.com'].some(x => owner.toLowerCase().includes(x));

            // A. Funnel: Unique Called
            if (lastCalledInRange(row, start, end)) {
                stats.funnel.uniqueCalled++;
                if (isTrackedUser) addToHourly(stats, row.son_arama_zamani, owner);
            }

            // B. Funnel: Applications
            const isAppStatus = ['Başvuru alındı', 'Kefil bekleniyor'].includes(status || '');
            if ((isAppStatus && isInRange(row.updated_at)) ||
                (approval === 'Onaylandı' && isInRange(approvalDate)) ||
                (isInRange(row.created_at) && status !== 'Yeni' && status !== '')) {
                applicationIds.add(row.id);
                if (isTrackedUser) userAppIds[owner]?.add(row.id);
            }

            // C. Funnel: Attorney Queries
            if (row.avukat_sorgu_durumu || row.avukat_sorgu_sonuc) {
                if (row.avukat_sorgu_durumu === 'BEKLİYOR') {
                    stats.funnel.attorneyPending++;
                }

                // Count as "Query Made"
                if (row.avukat_sorgu_durumu === 'BEKLİYOR' || (row.avukat_sorgu_sonuc && isInRange(row.updated_at))) {
                    attorneyQueryIds.add(row.id);
                }
            }

            // D. Funnel: Approved
            if (approval === 'Onaylandı' && isInRange(approvalDate)) {
                approvedIds.add(row.id);
                const limit = parseFloat(String(row.kredi_limiti || '0').replace(/[^0-9.]/g, '')) || 0;
                stats.funnel.approvedLimit += limit;
                if (isTrackedUser && stats.performance[owner]) {
                    stats.performance[owner].approvals++;
                    stats.performance[owner].approvedLimit += limit;
                }
            }

            // E. Funnel: Delivered
            const isDelivered = (status === 'Teslim edildi' || status === 'Satış yapıldı/Tamamlandı');
            if (isDelivered) {
                const dDate = row.teslim_tarihi || row.updated_at;
                if (isInRange(dDate)) {
                    deliveredIds.add(row.id);
                }
            }

            // F. Standard Aggregates (FIXED CITY LOGIC)
            if (row.sehir) {
                if (!stats.city[row.sehir]) stats.city[row.sehir] = { total: 0, delivered: 0, approved: 0, rejected: 0, cancelled: 0, kefil: 0, noEdevlet: 0, unreachable: 0, other: 0 };

                stats.city[row.sehir].total++;

                if (isDelivered) {
                    stats.city[row.sehir].delivered++;
                } else if (approval === 'Onaylandı') {
                    stats.city[row.sehir].approved++;
                } else if (['Reddetti', 'Uygun değil', 'Kriter Dışı'].includes(status || '') || approval === 'Reddedildi') {
                    stats.city[row.sehir].rejected++;
                } else if (status === 'İptal/Vazgeçti') {
                    stats.city[row.sehir].cancelled++;
                } else if (status === 'Kefil bekleniyor' || approval === 'Kefil İstendi') {
                    stats.city[row.sehir].kefil++;
                } else if (['Ulaşılamadı', 'Cevap Yok', 'Meşgul/Hattı kapalı', 'Yanlış numara', 'Numara kullanılmıyor'].includes(status || '')) {
                    stats.city[row.sehir].unreachable++;
                } else {
                    stats.city[row.sehir].other++;
                }
            }
            if (status) stats.status[status] = (stats.status[status] || 0) + 1;

            // Rejections
            if (['Reddetti', 'Uygun değil', 'İptal/Vazgeçti'].includes(status) || approval === 'Reddedildi') {
                let reason = 'Diğer';
                if (approval === 'Reddedildi') reason = 'Yönetici Reddi';
                else if (status === 'Reddetti') reason = 'Müşteri Reddetti';
                else if (status === 'Uygun değil') reason = 'Kriter Dışı';
                else if (status === 'İptal/Vazgeçti') reason = 'İptal';
                stats.rejection[reason] = (stats.rejection[reason] || 0) + 1;
            }
        });

        // --- 3. FINALIZE --- 
        stats.funnel.applications = applicationIds.size;
        stats.funnel.attorneyQueries = attorneyQueryIds.size;
        stats.funnel.approved = approvedIds.size;
        stats.funnel.delivered = deliveredIds.size;
        stats.funnel.sale = deliveredIds.size;
        stats.funnel.totalCalled = Object.values(stats.performance).reduce((a, b) => a + b.calls, 0);

        Object.keys(userAppIds).forEach(u => {
            if (stats.performance[u]) stats.performance[u].applications = userAppIds[u].size;
        });

        // Goals & Pace
        const goaldStart = new Date(); goaldStart.setDate(goaldStart.getDate() - 7);
        const goalStartTime = goaldStart.getTime();
        const last7DaysCalls: Record<string, number> = {};

        logs.forEach((l: any) => {
            const user = l.user_email;
            if (!user || ['sistem', 'admin', 'ibrahim'].some(x => user.includes(x))) return;
            if (new Date(l.timestamp).getTime() >= goalStartTime && l.action === 'PULL_LEAD') {
                last7DaysCalls[user] = (last7DaysCalls[user] || 0) + 1;
            }
        });
        Object.keys(stats.performance).forEach(user => {
            const avg = Math.round((last7DaysCalls[user] || 0) / 7);
            stats.performance[user].dailyGoal = Math.max(10, Math.ceil(avg * 1.1));
        });

        const userActivityMap: Record<string, number[]> = {};
        logs.forEach((l: any) => {
            const u = l.user_email;
            if (u && stats.performance[u] && new Date(l.timestamp).getTime() >= start) {
                if (!userActivityMap[u]) userActivityMap[u] = [];
                userActivityMap[u].push(new Date(l.timestamp).getTime());
            }
        });
        Object.keys(userActivityMap).forEach(u => {
            const times = userActivityMap[u].sort((a, b) => a - b);
            let total = 0, count = 0;
            for (let i = 1; i < times.length; i++) {
                const diff = times[i] - times[i - 1];
                if (diff < 3600000) { total += diff; count++; }
            }
            if (count > 0 && stats.performance[u]) stats.performance[u].paceMinutes = Math.round(total / count / 60000);
        });


        return NextResponse.json({ success: true, stats });

    } catch (error: any) {
        console.error('Reports Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

function lastCalledInRange(row: any, start: number, end: number) {
    if (!row.son_arama_zamani) return false;
    const t = new Date(row.son_arama_zamani).getTime();
    return t >= start && t <= end;
}

function addToHourly(stats: any, dateStr: string, owner: string) {
    const d = new Date(dateStr);
    const dateKey = utcFormatter.format(d);
    const hour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Istanbul', hour: 'numeric', hour12: false }).format(d));
    if (!stats.hourly[dateKey]) stats.hourly[dateKey] = {};
    if (!stats.hourly[dateKey][owner]) stats.hourly[dateKey][owner] = {};
    stats.hourly[dateKey][owner][hour] = (stats.hourly[dateKey][owner][hour] || 0) + 1;
}
