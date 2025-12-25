import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google';
import { COLUMNS } from '@/lib/sheets';
// Helper using Intl for robustness
const trFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

// Helper to get formatted date safely
function getDayKey(dateStr?: string) {
    if (!dateStr) return 'Unknown';
    try {
        let date = new Date(dateStr);
        // Handle DD.MM.YYYY
        if (isNaN(date.getTime()) && dateStr.includes('.')) {
            const parts = dateStr.split('.');
            if (parts.length === 3) {
                // assume dd.mm.yyyy
                date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
        }
        if (isNaN(date.getTime())) return 'Invalid Date';

        return trFormatter.format(date);
    } catch {
        return 'Invalid Date';
    }
}

export async function GET(req: NextRequest) {
    try {
        const client = getSheetsClient();
        const sheetId = process.env.GOOGLE_SHEET_ID;

        // Fetch Header AND Data
        const response = await client.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Customers!A1:ZZ', // Get all columns, dynamic rows
        });

        const allRows = response.data.values || [];
        if (allRows.length < 2) {
            return NextResponse.json({ success: true, stats: null, message: "No data found" });
        }

        const headers = allRows[0]; // Row 1
        const rows = allRows.slice(1); // Row 2+

        // Dynamic Column Mapper
        const getCol = (row: any[], name: string) => {
            // Find index in header (A1)
            // If not found, try to look up in hardcoded COLUMNS as backup? 
            // Better: rely on header row from sheet being accurate now that we have sync.
            const index = headers.indexOf(name);
            return index > -1 ? row[index] : undefined;
        };

        // Fallback for missing headers (if sync wasn't run yet)
        // If header "durum" is not found, we use strict index from COLUMNS
        const getColSafe = (row: any[], name: string) => {
            const index = headers.indexOf(name);
            if (index > -1) return row[index];

            // Fallback
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
            status: {} as Record<string, number>, // Pie Chart
            channel: {} as Record<string, number>, // New Channel Stats
            daily: {} as Record<string, number>, // Trend Line
            funnel: {
                total: 0,
                contacted: 0,
                storeVisit: 0,
                sale: 0,
            },
            todayCalled: 0,
            todayApproved: 0,
            totalCalled: 0,        // NEW: "Bugüne kadar arananlar"
            remainingToCall: 0,    // NEW: "Kalan aranacaklar"
            totalDelivered: 0,     // NEW: "Teslim edilenler"
            totalApproved: 0       // NEW: "Onaylananlar" (for Sales Rate calculation)
        };

        // Get today's date string in Turkey timezone
        const today = trFormatter.format(new Date());
        const nowTime = new Date().getTime();
        const TWO_HOURS = 2 * 60 * 60 * 1000;

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
            const nextCall = getColSafe(row, 'sonraki_arama_zamani');
            const locked = getColSafe(row, 'kilitli_mi');
            const owner = getColSafe(row, 'sahip');

            // 1. Call Stats (Total Called Logic Update)
            // User Request: "Total = Called + Remaining"
            // Definition: 
            // - Remaining = Yeni OR Aranacak
            // - Called = Everything else (Processed)
            const isRemaining = status === 'Yeni' || status === 'Aranacak';

            if (!isRemaining) {
                stats.totalCalled++;
            }

            if (lastCalled) {
                // Keep tracking today's activity based on date
                const callDay = getDayKey(lastCalled);
                if (callDay === today) {
                    stats.todayCalled++;
                }
            }

            // 2. Approval & Delivery Stats
            const approvalDate = getColSafe(row, 'onay_tarihi');
            if (approval === 'Onaylandı' || status === 'Onaylandı') {
                stats.totalApproved++; // Count for sales rate denominator
                if (approvalDate && getDayKey(approvalDate) === today) {
                    stats.todayApproved++;
                }
            }

            if (status === 'Teslim edildi') {
                stats.totalDelivered++;
            }

            // 3. Status Distribution
            stats.status[status] = (stats.status[status] || 0) + 1;

            // 4. Daily Trend
            const day = getDayKey(createdAt);
            if (day !== 'Unknown' && day !== 'Invalid Date') {
                stats.daily[day] = (stats.daily[day] || 0) + 1;
            }

            // 5. Funnel Logic
            if (status !== 'Yeni') stats.funnel.contacted++;
            if (status === 'Mağazaya davet edildi' || status === 'Teslim edildi' || status === 'Satış yapıldı/Tamamlandı') stats.funnel.storeVisit++;
            if (status === 'Teslim edildi' || status === 'Satış yapıldı/Tamamlandı') {
                stats.funnel.sale++;
            }

            // 6. Remaining to Call (Kalan Aranacak)
            if (isRemaining) {
                stats.remainingToCall++;
            }
            // Removed old date-based logic to ensure mathematical consistency with Total
            /*
            if (!lastCalled) {
                stats.remainingToCall++;
            }
            */
            // Original Pool Logic was:
            /*
            if (locked !== 'TRUE' && locked !== true && !owner) {
                if (status === 'Yeni') stats.remainingToCall++;
                // ...
            }
            */
            // We are changing this to strict "Not Called" to satisfy the report math check.

            // 7. City Stats (Detailed)
            if (city) {
                if (!stats.city[city]) {
                    stats.city[city] = {
                        total: 0,
                        delivered: 0,
                        approved: 0,
                        rejected: 0,
                        cancelled: 0,
                        kefil: 0,
                        noEdevlet: 0,
                        unreachable: 0,
                        other: 0
                    };
                }

                const cStats = stats.city[city];
                cStats.total++;

                if (status === 'Teslim edildi') cStats.delivered++;
                else if (status === 'Onaylandı' || approval === 'Onaylandı') cStats.approved++;
                else if (status === 'E-Devlet paylaşmak istemedi') cStats.noEdevlet++;
                else if (['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'].includes(status)) cStats.unreachable++;
                else if (status === 'Kefil bekleniyor' || approval === 'Kefil İstendi') cStats.kefil++;
                else if (['İptal/Vazgeçti', 'Reddetti'].includes(status)) cStats.cancelled++; // Grouping 'Reddetti' (User Rejected) with Cancelled as they are similar outcome for this report? Or keep separate? "Vazgeçen" usually implies İptal. 'Reddetti' implies 'Offer refused'. Keep them detailed?
                // User asked for "Vazgeçen". 'İptal/Vazgeçti' is the main one. 'Reddetti' is usually 'Fiyatı beğenmedi'.
                // Let's put 'Reddetti' in Rejected for now, or Cancelled?
                // Let's put 'İptal/Vazgeçti' to cancelled. 'Reddetti' to rejected.
                else if (status === 'Uygun değil' || approval === 'Reddedildi' || status === 'Reddetti') cStats.rejected++;
                else cStats.other++;
            }

            // 8. Product Stats
            if (product) stats.product[product] = (stats.product[product] || 0) + 1;

            // 9. Channel Stats
            if (channel) stats.channel[channel] = (stats.channel[channel] || 0) + 1;

            // 10. Profession Stats
            if (job) {
                if (!stats.profession[job]) stats.profession[job] = { count: 0, totalIncome: 0, avgIncome: 0 };
                stats.profession[job].count++;
                const income = parseFloat(incomeStr?.replace(/[^0-9]/g, '') || '0');
                if (income > 0) stats.profession[job].totalIncome += income;
            }

            // 11. Rejection Stats
            if (status === 'Reddetti' || approval === 'Reddedildi' || status === 'Uygun değil' || status === 'İptal/Vazgeçti') {
                let reason = 'Diğer';
                if (approval === 'Reddedildi') reason = 'Yönetici Reddi';
                else if (status === 'Reddetti') reason = 'Müşteri Reddetti';
                else if (status === 'Uygun değil') reason = 'Kriter Dışı';
                else if (status === 'İptal/Vazgeçti') reason = 'İptal/Vazgeçti';

                stats.rejection[reason] = (stats.rejection[reason] || 0) + 1;
            }
        });

        // Calculate Averages
        Object.keys(stats.profession).forEach(job => {
            const d = stats.profession[job];
            d.avgIncome = d.count > 0 ? Math.round(d.totalIncome / d.count) : 0;
        });

        // Sort Daily Data by Date
        const sortedDaily = Object.fromEntries(
            Object.entries(stats.daily).sort((a, b) => a[0].localeCompare(b[0])).slice(-30) // Last 30 days
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
