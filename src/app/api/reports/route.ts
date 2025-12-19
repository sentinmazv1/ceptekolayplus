import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google';
import { COLUMNS } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

// Helper to get day string YYYY-MM-DD
function getDayKey(dateStr?: string) {
    if (!dateStr) return 'Unknown';
    try {
        return new Date(dateStr).toISOString().split('T')[0];
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
            range: 'Customers!A1:ZZ', // Get everything including header
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
            const fallbackIndex = COLUMNS.indexOf(name);
            return fallbackIndex > -1 ? row[fallbackIndex] : undefined;
        };

        const stats = {
            city: {} as Record<string, number>,
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
            todayCalled: 0 // NEW: Count of customers called today
        };

        // Get today's date string
        const today = new Date().toISOString().split('T')[0];

        rows.forEach(row => {
            stats.funnel.total++;

            const status = getColSafe(row, 'durum') || 'Bilinmiyor';
            const city = getColSafe(row, 'sehir') || 'Belirsiz';
            const job = getColSafe(row, 'meslek_is') || 'Diğer';
            const incomeStr = getColSafe(row, 'son_yatan_maas');
            const product = getColSafe(row, 'talep_edilen_urun');
            const approval = getColSafe(row, 'onay_durumu');
            const channel = getColSafe(row, 'basvuru_kanali'); // New
            const createdAt = getColSafe(row, 'created_at');
            const lastCalled = getColSafe(row, 'son_arama_zamani'); // NEW

            // Count today's calls
            if (lastCalled) {
                const callDay = getDayKey(lastCalled);
                if (callDay === today) {
                    stats.todayCalled++;
                }
            }

            // 1. Status Distribution
            stats.status[status] = (stats.status[status] || 0) + 1;

            // 2. Daily Trend
            const day = getDayKey(createdAt);
            if (day !== 'Unknown' && day !== 'Invalid Date') {
                stats.daily[day] = (stats.daily[day] || 0) + 1;
            }

            // 3. Funnel Logic
            if (status !== 'Yeni') stats.funnel.contacted++;
            if (status === 'Mağazaya davet edildi' || status === 'Teslim edildi' || status === 'Satış yapıldı/Tamamlandı') stats.funnel.storeVisit++;

            // Conversion: "Teslim Edildi" or "Satış Yapıldı" OR Approval="Onaylandı" (maybe?)
            // Let's stick to explicit sales statuses for funnel bottom
            if (status === 'Teslim edildi' || status === 'Satış yapıldı/Tamamlandı') {
                stats.funnel.sale++;
            }

            // 4. City Stats
            if (city) stats.city[city] = (stats.city[city] || 0) + 1;

            // 5. Product Stats
            if (product) stats.product[product] = (stats.product[product] || 0) + 1;

            // 6. Channel Stats
            if (channel) stats.channel[channel] = (stats.channel[channel] || 0) + 1;

            // 7. Profession Stats
            if (job) {
                if (!stats.profession[job]) stats.profession[job] = { count: 0, totalIncome: 0, avgIncome: 0 };
                stats.profession[job].count++;
                const income = parseFloat(incomeStr?.replace(/[^0-9]/g, '') || '0');
                if (income > 0) stats.profession[job].totalIncome += income;
            }

            // 8. Rejection Stats
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
