import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google';
import { COLUMNS, parseSheetDate } from '@/lib/sheets';

// Helper using Intl for robustness
const trFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

// Helper for Sheet Strings (Naive TRT -> preserve face value)
const utcFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

// Helper to get formatted date safely
function getDayKey(dateStr?: string) {
    if (!dateStr) return 'Unknown';
    // Use parseSheetDate for robust handling
    const ts = parseSheetDate(dateStr);
    if (!ts) return 'Invalid Date';

    // Treat the timestamp as UTC to preserve the face value of the string
    return utcFormatter.format(new Date(ts));
}

export async function GET(req: NextRequest) {
    try {
        const client = getSheetsClient();
        const sheetId = process.env.GOOGLE_SHEET_ID;

        // Fetch Customers AND Logs
        // We need logs to calculate Pace (time between calls)
        const [customersParams, logsParams] = await Promise.all([
            client.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Customers!A1:ZZ' }),
            client.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Logs!A1:H' }) // Assuming Logs format
        ]);

        const allRows = customersParams.data.values || [];
        const logRows = logsParams.data.values || []; // Headers likely: log_id, timestamp, user_email, customer_id, action, ...

        if (allRows.length < 2) {
            return NextResponse.json({ success: true, stats: null, message: "No data found" });
        }

        const headers = allRows[0]; // Row 1
        const rows = allRows.slice(1); // Row 2+

        // Dynamic Column Mapper
        const getCol = (row: any[], name: string) => {
            const index = headers.indexOf(name);
            return index > -1 ? row[index] : undefined;
        };
        const getColSafe = (row: any[], name: string) => {
            const index = headers.indexOf(name);
            if (index > -1) return row[index];
            const fallbackIndex = COLUMNS.indexOf(name as any);
            return fallbackIndex > -1 ? row[fallbackIndex] : undefined;
        };

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
            status: {} as Record<string, number>, // Summary Table
            channel: {} as Record<string, number>,
            daily: {} as Record<string, number>,
            funnel: {
                total: 0,
                contacted: 0,
                applications: 0, // Başvuru Alındı
                sale: 0,
            },
            kpi: {
                totalCalled: 0, // Bugüne Kadar Aranan (Exclude Yeni)
                remainingToCall: 0, // Sadece 'Yeni'
                retryPool: 0, // Tekrar Aranacaklar (Havuz+Ulaşılamadı...)
                acquisitionRate: '0', // Başvuru / Aranan
                conversionRate: '0', // Teslim / Başvuru
            },
            todayCalled: 0,
            todayCalledByPerson: {} as Record<string, number>, // For Stacked Bar
            performance: {} as Record<string, {
                calls: number,
                approvals: number,
                paceMinutes: number,
                sms: number,
                whatsapp: number
            }>,
            hourly: {} as Record<string, Record<string, Record<number, number>>>, // Date -> User -> Hour -> Count
        };

        const today = trFormatter.format(new Date());

        // --- 1. PROCESS CUSTOMERS FOR CORE STATS ---
        rows.forEach(row => {
            stats.funnel.total++;

            const status = getColSafe(row, 'durum') || 'Bilinmiyor';
            const city = getColSafe(row, 'sehir');
            const job = getColSafe(row, 'meslek_is') || 'Diğer';
            const incomeStr = getColSafe(row, 'son_yatan_maas');
            const product = getColSafe(row, 'talep_edilen_urun');
            const approval = getColSafe(row, 'onay_durumu');
            const channel = getColSafe(row, 'basvuru_kanali');
            const createdAt = getColSafe(row, 'created_at');
            const lastCalled = getColSafe(row, 'son_arama_zamani');
            const owner = getColSafe(row, 'sahip') || 'Sistem';

            // KPI: Bugüne Kadar Aranan (Exclude 'Yeni')
            if (status !== 'Yeni') {
                stats.kpi.totalCalled++;
                stats.funnel.contacted++;
            }

            // KPI: Remaining (Strictly 'Yeni')
            if (status === 'Yeni') {
                stats.kpi.remainingToCall++;
            }

            // KPI: Retry Pool
            // Ulaşılamadı, Meşgul, Cevap Yok, Daha sonra, HAVUZ
            if (['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok', 'Daha sonra aranmak istiyor', 'HAVUZ'].includes(status)) {
                stats.kpi.retryPool++;
            }

            // Funnel: Applications (Başvuru Alındı+)
            /* 
               Logic: Any status implying application was taken:
               'Başvuru alındı', 'Onaylandı', 'Reddedildi', 'Teslim edildi', 'Kefil bekleniyor'
               Basically advanced stages.
            */
            const applicationStages = ['Başvuru alındı', 'Onaylandı', 'Reddedildi', 'Teslim edildi', 'Kefil bekleniyor', 'Eksik evrak bekleniyor', 'Satış yapıldı/Tamamlandı', 'Mağazaya davet edildi', 'Uygun değil', 'İptal/Vazgeçti'];
            // Uygun değil/İptal might happen after appliation, or during call. 
            // Let's stick to explicit 'Başvuru alındı' OR if approval status exists.

            let isApplication = false;
            // If status is specifically advanced OR approval flow touched
            if (['Başvuru alındı', 'Onaylandı', 'Teslim edildi', 'Kefil bekleniyor', 'Satış yapıldı/Tamamlandı', 'Eksik evrak bekleniyor'].includes(status)) {
                isApplication = true;
            } else if (approval && approval !== 'Beklemede') {
                isApplication = true;
            }

            if (isApplication) {
                stats.funnel.applications++;
            }

            if (status === 'Teslim edildi' || status === 'Satış yapıldı/Tamamlandı') {
                stats.funnel.sale++;
            }

            // TODAY STATS & HOURLY
            if (lastCalled) {
                const callDay = getDayKey(lastCalled);
                if (callDay === today) {
                    stats.todayCalled++;

                    // Track Count per Person
                    stats.todayCalledByPerson[owner] = (stats.todayCalledByPerson[owner] || 0) + 1;

                    // Init performace object
                    if (!stats.performance[owner]) stats.performance[owner] = { calls: 0, approvals: 0, paceMinutes: 0, sms: 0, whatsapp: 0 };
                    stats.performance[owner].calls++;
                }

                // Hourly (Stacked by User)
                const ts = parseSheetDate(lastCalled);
                if (ts) {
                    const d = new Date(ts);
                    const dateKey = utcFormatter.format(d); // YYYY-MM-DD Face Value

                    // Hour extracted from Face Value (UTC method on naive timestamp)
                    const hourStr = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', hour: 'numeric', hour12: false }).format(d);
                    const h = parseInt(hourStr, 10);

                    if (!isNaN(h)) {
                        if (!stats.hourly[dateKey]) stats.hourly[dateKey] = {};
                        if (!stats.hourly[dateKey][owner]) stats.hourly[dateKey][owner] = {};

                        stats.hourly[dateKey][owner][h] = (stats.hourly[dateKey][owner][h] || 0) + 1;
                    }
                }
            }

            // Approvals count for Performance
            if (approval === 'Onaylandı' || status === 'Onaylandı') {
                const appDate = getColSafe(row, 'onay_tarihi');
                const approver = getColSafe(row, 'onaylayan_admin') || 'Sistem';
                // If approved today, credit specific admin? Or credit Sales Rep who owns it?
                // "Aktivite Karşılaştırması" usually implies Sales Rep performance.
                // Let's credit the OWNER of the lead if it was approved today.
                if (appDate && getDayKey(appDate) === today) {
                    if (!stats.performance[owner]) stats.performance[owner] = { calls: 0, approvals: 0, paceMinutes: 0, sms: 0, whatsapp: 0 };
                    stats.performance[owner].approvals++;
                }
            }

            // Demographics & Other Charts
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
                const income = parseFloat(incomeStr?.replace(/[^0-9]/g, '') || '0');
                if (income > 0) stats.profession[job].totalIncome += income;
            }
            if (product) stats.product[product] = (stats.product[product] || 0) + 1;

            // Rejection logic (Simplified for brevity, same as before)
            if (status === 'Reddetti' || approval === 'Reddedildi' || status === 'Uygun değil' || status === 'İptal/Vazgeçti') {
                let reason = 'Diğer';
                if (approval === 'Reddedildi') reason = 'Yönetici Reddi';
                else if (status === 'Reddetti') reason = 'Müşteri Reddetti';
                else if (status === 'Uygun değil') reason = 'Kriter Dışı';
                else if (status === 'İptal/Vazgeçti') {
                    const specificReason = getColSafe(row, 'iptal_nedeni');
                    if (specificReason) reason = specificReason;
                }
                stats.rejection[reason] = (stats.rejection[reason] || 0) + 1;
            }

            // Daily Trend
            const day = getDayKey(createdAt);
            if (day !== 'Unknown' && day !== 'Invalid Date') {
                stats.daily[day] = (stats.daily[day] || 0) + 1;
            }
        });

        // --- 2. LOGS PROCESSING FOR PACE (Arama Sıklığı) ---
        // We only care about Today's "Call" actions or just sequential actions by user
        // Action: 'SET_NEXT_CALL', 'UPDATE_STATUS' (often implies a call result)
        // Group logs by User -> Sort by Time -> Calc Deltas
        const todayLogs = logRows.slice(1).filter(row => {
            const dateStr = row[1]; // timestamp
            return getDayKey(dateStr) === today;
        });

        const userLogs: Record<string, number[]> = {};

        todayLogs.forEach(row => {
            const user = row[2]; // user_email
            const tsStr = row[1];
            const ts = parseSheetDate(tsStr);
            if (user && ts) {
                if (!userLogs[user]) userLogs[user] = [];
                userLogs[user].push(ts);
            }
        });

        // Calculate Average Gap (Minutes)
        Object.keys(userLogs).forEach(user => {
            const timestamps = userLogs[user].sort((a, b) => a - b);
            if (timestamps.length < 2) return;

            let totalDiffMs = 0;
            let gaps = 0;

            for (let i = 1; i < timestamps.length; i++) {
                const diff = timestamps[i] - timestamps[i - 1];
                // Filter out massive gaps (e.g. > 60 mins) which might be logic breaks / lunch
                if (diff < 60 * 60 * 1000) {
                    totalDiffMs += diff;
                    gaps++;
                }
            }

            if (gaps > 0) {
                const avgMs = totalDiffMs / gaps;
                const avgMin = Math.round(avgMs / 1000 / 60);

                // Fallback key if user not in main list (though likely is)
                if (!stats.performance[user]) stats.performance[user] = { calls: 0, approvals: 0, paceMinutes: 0, sms: 0, whatsapp: 0 };
                stats.performance[user].paceMinutes = avgMin;
            }
        });


        // --- 3. FINAL CALCULATIONS ---

        // Acquisition Rate: Applications / Total Contacted (Aranan)
        stats.kpi.acquisitionRate = stats.kpi.totalCalled > 0
            ? ((stats.funnel.applications / stats.kpi.totalCalled) * 100).toFixed(1)
            : '0';

        // Conversion Rate: Sales / Applications
        stats.kpi.conversionRate = stats.funnel.applications > 0
            ? ((stats.funnel.sale / stats.funnel.applications) * 100).toFixed(1)
            : '0';

        // Averages for Profession
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
        return NextResponse.json({
            success: false,
            error: error.message || 'Unknown error',
            stack: error.stack
        }, { status: 500 });
    }
}
