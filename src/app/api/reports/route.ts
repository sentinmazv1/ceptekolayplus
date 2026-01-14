
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
    timeZone: 'Europe/Istanbul', // Changed to match local operations
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

function getDayKey(dateStr?: string) {
    if (!dateStr) return 'Unknown';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return utcFormatter.format(d);
}

export async function GET(req: NextRequest) {
    try {
        // Fetch Data from Supabase
        const queryDate = req.nextUrl.searchParams.get('date');
        const targetDate = queryDate ? queryDate : trFormatter.format(new Date());

        // Fetch Data from Supabase
        const [customers, logs] = await Promise.all([
            getReportData(),
            getAllLogs(targetDate) // Optimized: Fetch logs ONLY for the target day
        ]);

        if (!customers || customers.length === 0) {
            return NextResponse.json({ success: true, stats: null, message: "No data found" });
        }

        const stats = {
            city: {} as Record<string, {
                total: number;
                delivered: number;
                approved: number;
                rejected: number;
                cancelled: number;
                kefil: number;
                noEdevlet: number;
                unreachable: number;
                other: number;
            }>,
            profession: {} as Record<string, { count: number, totalIncome: number, avgIncome: number }>,
            product: {} as Record<string, number>,
            rejection: {} as Record<string, number>,
            status: {} as Record<string, number>,
            channel: {} as Record<string, number>,
            daily: {} as Record<string, number>,
            funnel: {
                total: 0,
                contacted: 0,
                applications: 0,
                sale: 0,
            },
            kpi: {
                totalCalled: 0,
                remainingToCall: 0,
                retryPool: 0,
                acquisitionRate: '0',
                conversionRate: '0',
            },
            todayCalled: 0,
            todayCalledByPerson: {} as Record<string, number>,
            performance: {} as Record<string, {
                calls: number,
                approvals: number,
                paceMinutes: number,
                sms: number,
                whatsapp: number
            }>,
            hourly: {} as Record<string, Record<string, Record<number, number>>>,
        };

        const queryDate = req.nextUrl.searchParams.get('date');
        const targetDate = queryDate ? queryDate : trFormatter.format(new Date());

        // --- 1. PROCESS CUSTOMERS ---
        customers.forEach((row: any) => {
            stats.funnel.total++;

            const status = row.durum || 'Bilinmiyor';
            const city = row.sehir;
            const job = row.meslek_is || 'Diğer';
            const incomeStr = row.son_yatan_maas || row.maas_bilgisi; // Map legacy
            const product = row.talep_edilen_urun;
            const approval = row.onay_durumu;
            const channel = row.basvuru_kanali;
            const createdAt = row.created_at;
            const lastCalled = row.son_arama_zamani;
            const owner = row.sahip || row.sahip_email || 'Sistem';

            // KPI
            if (status !== 'Yeni') {
                stats.kpi.totalCalled++;
                stats.funnel.contacted++;
            }
            if (status === 'Yeni') {
                stats.kpi.remainingToCall++;
            }
            if (['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok', 'Daha sonra aranmak istiyor', 'HAVUZ'].includes(status)) {
                stats.kpi.retryPool++;
            }

            // Funnel
            let isApplication = false;
            if (['Başvuru alındı', 'Onaylandı', 'Teslim edildi', 'Kefil bekleniyor', 'Satış yapıldı/Tamamlandı', 'Eksik evrak bekleniyor'].includes(status)) {
                isApplication = true;
            } else if (approval && approval !== 'Beklemede') {
                isApplication = true;
            }

            if (isApplication) stats.funnel.applications++;
            if (status === 'Teslim edildi' || status === 'Satış yapıldı/Tamamlandı') stats.funnel.sale++;

            // Today Stats
            if (lastCalled) {
                const callDay = getDayKey(lastCalled);
                if (callDay === targetDate) {
                    stats.todayCalled++;
                    stats.todayCalledByPerson[owner] = (stats.todayCalledByPerson[owner] || 0) + 1;
                    if (!stats.performance[owner]) stats.performance[owner] = { calls: 0, approvals: 0, paceMinutes: 0, sms: 0, whatsapp: 0 };
                }

                // Hourly
                const d = new Date(lastCalled);
                if (!isNaN(d.getTime())) {
                    const dateKey = utcFormatter.format(d);
                    if (dateKey === targetDate) {
                        const h = d.getUTCHours() + 3; // TRT adjustment if stored as UTC ISO?
                        // Actually, created_at is UTC. We need Local Hour (TRT).
                        // Date object handles timezone if we configured env? No, Node defaults to UTC usually.
                        // Let's use Intl to be safe.
                        const hourStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Istanbul', hour: 'numeric', hour12: false }).format(d);
                        const hInt = parseInt(hourStr, 10);

                        if (!isNaN(hInt)) {
                            if (!stats.hourly[dateKey]) stats.hourly[dateKey] = {};
                            if (!stats.hourly[dateKey][owner]) stats.hourly[dateKey][owner] = {};
                            stats.hourly[dateKey][owner][hInt] = (stats.hourly[dateKey][owner][hInt] || 0) + 1;
                        }
                    }
                }
            }

            // Approvals Perf
            if (approval === 'Onaylandı' || status === 'Onaylandı') {
                const appDate = row.onay_tarihi;
                if (appDate && getDayKey(appDate) === targetDate) {
                    if (!stats.performance[owner]) stats.performance[owner] = { calls: 0, approvals: 0, paceMinutes: 0, sms: 0, whatsapp: 0 };
                    stats.performance[owner].approvals++;
                }
            }

            // Charts
            stats.status[status] = (stats.status[status] || 0) + 1;
            if (channel) stats.channel[channel] = (stats.channel[channel] || 0) + 1;

            if (city) {
                if (!stats.city[city]) stats.city[city] = { total: 0, delivered: 0, approved: 0, rejected: 0, cancelled: 0, kefil: 0, noEdevlet: 0, unreachable: 0, other: 0 };
                const cStats = stats.city[city];
                cStats.total++;
                if (status === 'Teslim edildi') cStats.delivered++;
                else if (status === 'Onaylandı' || approval === 'Onaylandı') cStats.approved++;
                else if (status === 'E-Devlet paylaşmak istemedi') cStats.noEdevlet++;
                else if (['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'].includes(status)) cStats.unreachable++;
                else if (status === 'Kefil bekleniyor' || approval === 'Kefil İstendi') cStats.kefil++;
                else if (['İptal/Vazgeçti', 'Reddetti'].includes(status)) cStats.cancelled++;
                else if (status === 'Uygun değil' || approval === 'Reddedildi') cStats.rejected++;
                else cStats.other++;
            }

            if (job) {
                if (!stats.profession[job]) stats.profession[job] = { count: 0, totalIncome: 0, avgIncome: 0 };
                stats.profession[job].count++;
                const income = parseFloat(String(incomeStr || '0').replace(/[^0-9]/g, ''));
                if (income > 0) stats.profession[job].totalIncome += income;
            }

            if (product) stats.product[product] = (stats.product[product] || 0) + 1;

            if (['Reddetti', 'Uygun değil', 'İptal/Vazgeçti'].includes(status) || approval === 'Reddedildi') {
                let reason = 'Diğer';
                if (approval === 'Reddedildi') reason = 'Yönetici Reddi';
                else if (status === 'Reddetti') reason = 'Müşteri Reddetti';
                else if (status === 'Uygun değil') reason = 'Kriter Dışı';
                else if (status === 'İptal/Vazgeçti') reason = 'İptal';
                stats.rejection[reason] = (stats.rejection[reason] || 0) + 1;
            }

            const day = getDayKey(createdAt);
            if (day !== 'Unknown' && day !== 'Invalid Date') {
                stats.daily[day] = (stats.daily[day] || 0) + 1;
            }
        });

        // --- 2. LOGS ---
        const targetLogs = logs.filter((l: any) => getDayKey(l.timestamp) === targetDate);
        const userLogs: Record<string, number[]> = {};

        targetLogs.forEach((l: any) => {
            const user = l.user_email;
            if (user) {
                if (!stats.performance[user]) stats.performance[user] = { calls: 0, approvals: 0, paceMinutes: 0, sms: 0, whatsapp: 0 };
                if (l.action === 'SEND_SMS') stats.performance[user].sms++;
                if (l.action === 'SEND_WHATSAPP') stats.performance[user].whatsapp++;
                if (l.action === 'PULL_LEAD') stats.performance[user].calls++;

                if (l.timestamp) {
                    const ts = new Date(l.timestamp).getTime();
                    if (!userLogs[user]) userLogs[user] = [];
                    userLogs[user].push(ts);
                }
            }
        });

        Object.keys(userLogs).forEach(user => {
            const timestamps = userLogs[user].sort((a, b) => a - b);
            if (timestamps.length < 2) return;
            let totalDiffMs = 0;
            let gaps = 0;
            for (let i = 1; i < timestamps.length; i++) {
                const diff = timestamps[i] - timestamps[i - 1];
                if (diff < 60 * 60 * 1000) {
                    totalDiffMs += diff;
                    gaps++;
                }
            }
            if (gaps > 0) {
                const avgMin = Math.round(totalDiffMs / gaps / 60000);
                if (stats.performance[user]) stats.performance[user].paceMinutes = avgMin;
            }
        });

        // Cleanup
        Object.keys(stats.performance).forEach(key => {
            if (['sistem', 'system', 'admin'].includes(key.toLowerCase())) delete stats.performance[key];
        });

        // Rate Calcs
        stats.kpi.acquisitionRate = stats.kpi.totalCalled > 0
            ? ((stats.funnel.applications / stats.kpi.totalCalled) * 100).toFixed(1)
            : '0';
        stats.kpi.conversionRate = stats.funnel.applications > 0
            ? ((stats.funnel.sale / stats.funnel.applications) * 100).toFixed(1)
            : '0';

        Object.keys(stats.profession).forEach(job => {
            const d = stats.profession[job];
            d.avgIncome = d.count > 0 ? Math.round(d.totalIncome / d.count) : 0;
        });

        const sortedDaily = Object.fromEntries(
            Object.entries(stats.daily).sort((a, b) => a[0].localeCompare(b[0])).slice(-30)
        );
        stats.daily = sortedDaily;

        return NextResponse.json({ success: true, stats });
    } catch (error: any) {
        console.error('Reports API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
