
import { NextRequest, NextResponse } from 'next/server';
import { getReportData, getAllLogs, getInventoryStats, getLeadStats } from '@/lib/leads';

// ... (existing code)

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
        const todayStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Istanbul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());

        // Date Range: Default to TODAY if not provided
        const startDate = url.searchParams.get('startDate') || todayStr;
        const endDate = url.searchParams.get('endDate') || todayStr;

        // For Goal Calculation, we need logs from 7 days ago.
        // Ensure we fetch enough history regardless of the requested report window.
        const headerDate = new Date();
        const historyDate = new Date(headerDate.getTime() - (8 * 24 * 60 * 60 * 1000)); // 8 days buffer
        const historyStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(historyDate);

        // Logs Start: Minimum of (Requested Start, 7 Days Ago)
        const logsStart = startDate < historyStr ? startDate : historyStr;

        const [customers, logs, inventoryStats, leadStats] = await Promise.all([
            getReportData(startDate, endDate),
            getAllLogs(undefined, logsStart, endDate), // Fetch wider range for goals
            getInventoryStats(),
            getLeadStats()
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

        // Date Helpers
        // Adjust for Istanbul Time (UTC+3)
        // new Date('2024-01-01') is UTC 00:00. Istanbul 00:00 is UTC 21:00 (Prev Day).
        // So we subtract 3 hours from the UTC timestamps.
        const TZ_OFFSET = 3 * 60 * 60 * 1000;
        const start = new Date(startDate).getTime() - TZ_OFFSET;
        const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - TZ_OFFSET - 1;

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
        const userBackOfficeIds: Record<string, Set<string>> = {}; // User -> Set<LeadID> (Touched for BackOffice)

        // --- 1. PROCESS LOGS (Activity Flow) ---
        // SORT LOGS FIRST for Debounce Logic (Crucial for sequential grouping)
        logs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Debounce Tracking: User -> Customer -> LastTimestamp
        const lastBackofficeTime: Record<string, Record<string, number>> = {};

        // Puts "Events" into buckets
        logs.forEach((l: any) => {
            const user = l.user_email;
            if (!user) return;
            if (['sistem', 'system', 'admin', 'ibrahim', 'ibrahimsentinmaz@gmail.com'].some(x => user.toLowerCase().includes(x))) return;

            const ts = new Date(l.timestamp).getTime();
            const action = l.action;

            if (ts >= start && ts <= end) {
                // Init Perf
                if (!stats.performance[user]) stats.performance[user] = { pulled: 0, calls: 0, approvals: 0, approvedLimit: 0, applications: 0, paceMinutes: 0, sms: 0, whatsapp: 0, sales: 0, salesVolume: 0, backoffice: 0, dailyGoal: 0, image: '' };
                if (!userAppIds[user]) userAppIds[user] = new Set();
                if (!userBackOfficeIds[user]) userBackOfficeIds[user] = new Set();
                if (!lastBackofficeTime[user]) lastBackofficeTime[user] = {};

                // 1. Funnel Actions
                if (action === 'PULL_LEAD') {
                    stats.performance[user].pulled++;
                } else if (action === 'CLICK_CALL') {
                    stats.performance[user].calls++;
                } else if (action === 'SEND_SMS' || action === 'CLICK_SMS') {
                    stats.performance[user].sms++;
                } else if (action === 'SEND_WHATSAPP' || action === 'CLICK_WHATSAPP') {
                    stats.performance[user].whatsapp++;
                } else if ((action === 'UPDATE_STATUS' || action === 'CREATED')) {
                    const val = (l.new_value || '').toLowerCase();
                    // STRICT CHECK per user request:
                    // TRIGGERS for "Application Taken":
                    const validAppStatuses = [
                        'başvuru alındı',
                        'onaya gönderildi',
                        'onay bekleniyor',
                        'onay bekliyor', // Common variation
                        'onaya sunuldu', // Requested alias
                        'eksik evrak bekleniyor' // Implies process started
                    ];

                    if (validAppStatuses.some(s => val === s || val.includes(s))) {
                        applicationIds.add(l.customer_id);
                        userAppIds[user].add(l.customer_id);
                    }
                } else {
                    // 2. Backoffice Actions (Any other meaningful change like notes or field updates)
                    if (['UPDATE_STATUS', 'UPDATE_FIELDS', 'ADD_NOTE', 'CREATED'].includes(action)) {
                        // FRAUD PREVENTION: 5 Minute Debounce per Customer
                        const lastTime = lastBackofficeTime[user][l.customer_id] || 0;
                        if (ts - lastTime > 300000) { // 5 minutes = 300,000 ms
                            stats.performance[user].backoffice++;
                            lastBackofficeTime[user][l.customer_id] = ts;
                        }
                    }
                }

                // Attorney Queries (Log Source)
                // Check NewValue OR Note (Note usually contains "Avukat Sorgu Updated")
                const isAttorneyLog =
                    (l.new_value && l.new_value.match(/avukat|sorgu/i)) ||
                    (l.note && l.note.match(/avukat|sorgu/i)) ||
                    (l.action === 'UPDATE_FIELDS' && (l.old_value === 'BEKLİYOR' || l.new_value === 'BEKLİYOR'));

                if ((action === 'UPDATE_FIELDS' || action === 'UPDATE_STATUS') && isAttorneyLog) {
                    const isKefilLog = (l.note && l.note.includes('Kefil')) ||
                        (l.new_value && typeof l.new_value === 'string' && l.new_value.includes('Kefil'));

                    const uniqueId = isKefilLog ? l.customer_id + '_k' : l.customer_id;

                    // Count each unique query in this period
                    if (!attorneyQueryIds.has(uniqueId)) {
                        attorneyQueryIds.add(uniqueId);

                        // Breakdown Statistics based on LOGGED COMPLETED STATUS
                        const val = String(l.new_value || '');
                        if (val.includes('Temiz')) stats.funnel.attorneyClean++;
                        else if (val.includes('Riskli') || val.includes('Sorunlu')) stats.funnel.attorneyRisky++;
                        else if (val.includes('Onaylan') || val === 'Onaylandı') stats.funnel.attorneyApproved++;
                        else if (val.includes('Red') || val === 'Reddedildi') stats.funnel.attorneyRejected++;
                    }
                }
            }
        });

        // --- 2. PROCESS CUSTOMERS (Snapshots & Fallbacks) ---
        customers.forEach((row: any) => {
            const approvalDate = row.onay_tarihi;
            const status = row.durum;
            const approval = row.onay_durumu;
            const owner = row.sahip || row.sahip_email;
            const createdAt = row.created_at;

            // SKIP ignored users
            const isTrackedUser = owner && !['sistem', 'system', 'admin', 'ibrahim', 'ibrahimsentinmaz@gmail.com'].some(x => owner.toLowerCase().includes(x));

            // A. Funnel: Unique Called
            if (lastCalledInRange(row, start, end)) {
                stats.funnel.uniqueCalled++;
                if (isTrackedUser) addToHourly(stats, row.son_arama_zamani, owner);
            }

            // B. Funnel: Applications
            // FIXED LOGIC: Only count if CREATED today AND status implies a real application.
            // Exclude 'Yeni', 'Aranacak', or Call Outcomes (Ulaşılamadı, vb.) which might happen on day 1 without an app.
            const isApplication = ['Başvuru alındı', 'Kefil bekleniyor', 'Onaylandı', 'Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Kefil İstendi', 'Reddedildi'].includes(status || '') || approval === 'Onaylandı';

            if (isInRange(createdAt) && isApplication) {
                // New customer today who immediately went to a process status (Manual Entry or Super Fast Flow)
                applicationIds.add(row.id);
                if (isTrackedUser) userAppIds[owner]?.add(row.id);
            }
            // Note: We already captured status *changes* in the Logs loop above.

            // ... (Rest of logic remains mostly same, just checking ranges)

            // C. Funnel: Attorney Queries (SNAPSHOT ENHANCEMENT)
            // Ensure Current Pending are counted in TOTAL even if logs missed them

            // Main
            if (['Sorgu Bekleniyor', 'BEKLİYOR'].some(s => (row.avukat_sorgu_durumu || '').includes(s))) {
                stats.funnel.attorneyPending++;
                attorneyQueryIds.add(row.id); // Add to TOTAL
            }
            // Kefil
            if (['Sorgu Bekleniyor', 'BEKLİYOR'].some(s => (row.kefil_avukat_sorgu_durumu || '').includes(s))) {
                stats.funnel.attorneyPending++;
                attorneyQueryIds.add(row.id + '_k'); // Add to TOTAL
            }


            // D. Funnel: Approved
            if (approval === 'Onaylandı' && isInRange(approvalDate)) {
                approvedIds.add(row.id);

                // Robust parsing for Turkish currency (e.g., "50.000,00 TL" -> 50000.00)
                let limitStr = String(row.kredi_limiti || '0');
                // Remove all non-numeric characters EXCEPT comma and dot
                limitStr = limitStr.replace(/[^0-9,.-]/g, '');
                // Replace dots (thousand separators) with empty string if they are not decimal
                // Assumption: Turkish format "100.000,00" -> remove dots, replace comma with dot.
                if (limitStr.includes(',') && limitStr.includes('.')) {
                    limitStr = limitStr.replace(/\./g, '').replace(',', '.');
                } else if (limitStr.includes(',')) {
                    limitStr = limitStr.replace(',', '.');
                }

                const limit = parseFloat(limitStr) || 0;

                stats.funnel.approvedLimit += limit;
                if (isTrackedUser && stats.performance[owner]) {
                    stats.performance[owner].approvals++;
                    stats.performance[owner].approvedLimit += limit;
                }
            }

            // E. Funnel: Delivered (Item Based)
            let itemSaleCount = 0;
            let itemRevenue = 0;

            // 1. Process List
            try {
                if (row.satilan_urunler) {
                    const products = typeof row.satilan_urunler === 'string' ? JSON.parse(row.satilan_urunler) : row.satilan_urunler;
                    if (Array.isArray(products)) {
                        products.forEach((p: any) => {
                            // Check item date OR fallback to main delivery date being in range
                            // Fix: If the LEAD is delivered/sold in this range, count ALL its items, 
                            // ignoring individual item dates if they are old or mismatched.
                            // We trust 'row.teslim_tarihi' as the primary "Sale Event" time.
                            const itemDate = p.satis_tarihi;
                            const mainDate = row.teslim_tarihi;

                            // 1. If Item has date -> Check ONLY that date.
                            // 2. If Item has NO date -> Fallback to Main Delivery Date.
                            if (itemDate) {
                                if (isInRange(itemDate)) {
                                    itemSaleCount++;
                                    itemRevenue += parseFloat(String(p.satis_fiyati || p.fiyat || '0'));
                                }
                            } else {
                                // Fallback for legacy items inside the array that lack a date
                                if (mainDate && isInRange(mainDate)) {
                                    itemSaleCount++;
                                    itemRevenue += parseFloat(String(p.satis_fiyati || p.fiyat || '0'));
                                }
                            }
                        });
                    }
                }
            } catch (e) {
                // ignore parse error
            }

            // 2. Legacy Fallback
            const sLower = (status || '').toLowerCase();
            if (itemSaleCount === 0 && (sLower === 'teslim edildi' || sLower === 'satış yapıldı/tamamlandı')) {
                const dDate = row.teslim_tarihi;
                if (dDate && isInRange(dDate)) {
                    itemSaleCount = 1;
                    // Limit as proxy
                    let limitStr = String(row.kredi_limiti || '0').replace(/[^0-9,.-]/g, '');
                    if (limitStr.includes(',') && limitStr.includes('.')) limitStr = limitStr.replace(/\./g, '').replace(',', '.');
                    else if (limitStr.includes(',')) limitStr = limitStr.replace(',', '.');
                    itemRevenue = parseFloat(limitStr) || 0;
                }
            }

            if (itemSaleCount > 0) {
                stats.funnel.delivered += itemSaleCount;
                stats.funnel.deliveredVolume += itemRevenue;
                stats.funnel.sale += itemSaleCount;
                deliveredIds.add(row.id); // Still track unique customers for reference if needed

                if (isTrackedUser) {
                    if (!stats.performance[owner]) {
                        stats.performance[owner] = { pulled: 0, calls: 0, approvals: 0, approvedLimit: 0, applications: 0, paceMinutes: 0, sms: 0, whatsapp: 0, sales: 0, salesVolume: 0, backoffice: 0, dailyGoal: 10, image: '' };
                    }
                    if (stats.performance[owner]) {
                        stats.performance[owner].sales += itemSaleCount;
                        stats.performance[owner].salesVolume = (stats.performance[owner].salesVolume || 0) + itemRevenue;
                    }
                }
            }

            // F. Standard Aggregates (Cohort: Only for leads CREATED in this range)
            // This answers "What is the status/city/outcome of leads generated in this period?"
            if (isInRange(row.created_at)) {

                const isDelivered = (status === 'Teslim edildi' || status === 'Satış yapıldı/Tamamlandı');

                // City Stats
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

                // Status Stats
                if (status) stats.status[status] = (stats.status[status] || 0) + 1;

                // Rejections (Cancellation Reasons)
                if (['Reddetti', 'Uygun değil', 'İptal/Vazgeçti'].includes(status) || approval === 'Reddedildi') {
                    let reason = 'Diğer';
                    if (approval === 'Reddedildi') reason = 'Yönetici Reddi';
                    else if (status === 'Reddetti') reason = 'Müşteri Reddetti';
                    else if (status === 'Uygun değil') reason = 'Kriter Dışı';

                    // --- PRECISE CANCELLATION REASON ---
                    // If status is 'İptal/Vazgeçti', use the specific 'iptal_nedeni' if available
                    if (status === 'İptal/Vazgeçti') {
                        reason = row.iptal_nedeni || 'İptal (Nedensiz)';
                    }

                    stats.rejection[reason] = (stats.rejection[reason] || 0) + 1;
                }
            }
        });

        // --- 3. FINALIZE --- 
        stats.funnel.applications = applicationIds.size;
        stats.funnel.attorneyQueries = attorneyQueryIds.size;
        stats.funnel.approved = approvedIds.size;
        // Delivered & Sale are calculated cumulatively above based on items
        stats.funnel.totalCalled = Object.values(stats.performance).reduce((a, b) => a + b.calls, 0);

        Object.keys(userAppIds).forEach(u => {
            if (stats.performance[u]) {
                stats.performance[u].applications = userAppIds[u].size;
            }
        });

        // Goals: Last 7 Days EXCLUDING Today (Static Goal)
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const sevenDaysAgoMidnight = todayMidnight.getTime() - (7 * 24 * 60 * 60 * 1000);
        const todayMidnightTime = todayMidnight.getTime();

        const last7DaysCalls: Record<string, number> = {};
        const lastLogTime: Record<string, number> = {};

        // Sort logs by time to ensure correct dedup (Done at start)
        // logs.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        logs.forEach((l: any) => {
            const user = l.user_email;
            if (!user || ['sistem', 'admin', 'ibrahim'].some(x => user.includes(x))) return;
            const t = new Date(l.timestamp).getTime();

            // Strictly between 7 days ago (inclusive) and today midnight (exclusive)
            if (t >= sevenDaysAgoMidnight && t < todayMidnightTime && l.action === 'PULL_LEAD') { // Fix: Should based on PULL_LEAD or CLICK_CALL? Original was PULL_LEAD. Let's stick to PULL_LEAD or CLICK_CALL based on what stats.performance counts. 
                // Stats performance counts CLICK_CALL for 'calls'. PULL_LEAD is 'pulled'. 
                // User asked for "Call Target". Usually that means CLICK_CALL.
                // However, previous code used PULL_LEAD.
                // Let's check stats.performance[user].calls counting logic above.
                // It counts 'CLICK_CALL'. 
                // Let's SWITCH to CLICK_CALL for goal calculation to be consistent with "Call Goal".
                // Deduplicate: If same user calls multiple leads within 10 seconds? Maybe less strict for calls.
                // Let's allow all CLICK_CALLs for now or keep PULL_LEAD?
                // "Arama hedefi" => Call Target. So CLICK_CALL is better.
            }
            // WAIT - Re-reading previous logic:
            // if (t >= threeDaysAgoMidnight && t < todayMidnightTime && l.action === 'PULL_LEAD')
            // It was counting PULL_LEAD. 
            // If the user wants "Call Goal", they might mean actual calls. 
            // But if the business logic "Arama" loosely means "Processed Lead", then PULL_LEAD is fine. 
            // "Panelde sağ üstte ki güncel arama ve hedef" -> "Current Call and Target".
            // Display shows `stats.performance[user].calls`.
            // So goal should probably be based on CALLS (CLICK_CALL).

            // Let's change action to 'CLICK_CALL' generally.
            if (t >= sevenDaysAgoMidnight && t < todayMidnightTime && l.action === 'CLICK_CALL') {
                last7DaysCalls[user] = (last7DaysCalls[user] || 0) + 1;
            }
        });
        Object.keys(stats.performance).forEach(user => {
            // Average of 7 days
            // Note: Should we divide by 7 or by "Active Days"?
            // Simple average over 7 days implies dividing by 7.
            const avg = Math.round((last7DaysCalls[user] || 0) / 7);
            stats.performance[user].dailyGoal = Math.max(10, Math.ceil(avg * 1.10)); // +10%
        });

        // Pace: Include today for pace calculation
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
