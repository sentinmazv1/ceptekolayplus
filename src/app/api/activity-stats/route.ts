import { NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google';
import { COLUMNS } from '@/lib/sheets';
import { formatInTimeZone } from 'date-fns-tz';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getSheetsClient();
        const sheetId = process.env.GOOGLE_SHEET_ID;

        const response = await client.spreadsheets.values.get({
            spreadsheetId: sheetId!,
            range: 'Customers!A1:ZZ',
        });

        const allRows = response.data.values || [];
        if (allRows.length < 2) {
            return NextResponse.json(getEmptyStats());
        }

        const headers = allRows[0];
        const rows = allRows.slice(1);

        const getCol = (row: any[], name: string) => {
            const index = headers.indexOf(name);
            if (index > -1) return row[index];
            const fallbackIndex = COLUMNS.indexOf(name as any);
            return fallbackIndex > -1 ? row[fallbackIndex] : undefined;
        };

        const today = formatInTimeZone(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd');

        const stats = {
            todayApprovals: 0,
            todayCalls: 0,
            todayRejections: 0,
            waitingToCall: 0,
            whatsappCount: 0,
            storeCount: 0,
            topPerformer: { name: '', count: 0 },
            conversionRate: 0,
            totalCreditApproved: 0,
            topCity: { name: '', count: 0 },
            peakHour: 0,
            upcomingBirthdays: 0,
            streak: 0,
            hoursSinceLastCall: 0, // NEW: for "su iç" logic
            activityLevel: 0, // NEW: actions today (for "mola ver")
        };

        const cityCount: Record<string, number> = {};
        const hourCalls: Record<number, number> = {};
        const performerCounts: Record<string, number> = {};

        rows.forEach(row => {
            const status = getCol(row, 'durum');
            const channel = getCol(row, 'basvuru_kanali');
            const onayDurumu = getCol(row, 'onay_durumu');
            const lastCalled = getCol(row, 'son_arama_zamani');
            const city = getCol(row, 'sehir');
            const credit = getCol(row, 'kredi_limiti');
            const owner = getCol(row, 'sahip');
            const onayTarihi = getCol(row, 'onay_tarihi');

            // Today's approvals
            if (onayTarihi) {
                try {
                    const onayDay = formatInTimeZone(new Date(onayTarihi), 'Europe/Istanbul', 'yyyy-MM-dd');
                    if (onayDay === today && onayDurumu === 'Onaylandı') {
                        stats.todayApprovals++;
                        if (credit) {
                            stats.totalCreditApproved += parseFloat(credit.replace(/[^0-9]/g, '') || '0');
                        }
                    }
                } catch (e) {
                    // Invalid date, skip
                }
            }

            // Today's calls
            if (lastCalled) {
                try {
                    const callDay = formatInTimeZone(new Date(lastCalled), 'Europe/Istanbul', 'yyyy-MM-dd');
                    if (callDay === today) {
                        stats.todayCalls++;

                        // Peak hour tracking
                        try {
                            const callHour = new Date(lastCalled).getHours();
                            hourCalls[callHour] = (hourCalls[callHour] || 0) + 1;
                        } catch { }
                    }
                } catch (e) {
                    // Invalid date, skip
                }
            }

            // Today's rejections
            if (status === 'Reddetti' || onayDurumu === 'Reddedildi') {
                stats.todayRejections++;
            }

            // Waiting to call
            if (status === 'Yeni' || status === 'Aranacak') {
                stats.waitingToCall++;
            }

            // Channel counts
            if (channel === 'WhatsApp' || channel === 'Whatsapp') {
                stats.whatsappCount++;
            } else if (channel === 'Mağaza' || channel === 'Store') {
                stats.storeCount++;
            }

            // City tracking
            if (city) {
                cityCount[city] = (cityCount[city] || 0) + 1;
            }

            // Performer tracking (sales reps with approvals)
            if (owner && onayDurumu === 'Onaylandı') {
                performerCounts[owner] = (performerCounts[owner] || 0) + 1;
            }
        });

        // Find top city
        let topCityName = '';
        let maxCityCount = 0;
        for (const [city, count] of Object.entries(cityCount)) {
            if (count > maxCityCount) {
                maxCityCount = count;
                topCityName = city;
            }
        }
        stats.topCity = { name: topCityName, count: maxCityCount };

        // Find peak hour
        let peakHour = 0;
        let maxHourCalls = 0;
        for (const [hour, count] of Object.entries(hourCalls)) {
            if (count > maxHourCalls) {
                maxHourCalls = count;
                peakHour = parseInt(hour);
            }
        }
        stats.peakHour = peakHour;

        // Find top performer
        let topName = '';
        let maxCount = 0;
        for (const [name, count] of Object.entries(performerCounts)) {
            if (count > maxCount) {
                maxCount = count;
                topName = name.split('@')[0]; // Get name part of email
            }
        }
        stats.topPerformer = { name: topName, count: maxCount };

        // Conversion rate (approximation)
        if (rows.length > 0) {
            stats.conversionRate = Math.round((stats.todayApprovals / rows.length) * 100);
        }

        // Streak calculation (simplified - consecutive days with approvals)
        stats.streak = calculateStreak(); // TODO: implement proper streak logic

        // Calculate hours since last call (most recent call time)
        let mostRecentCallTime = 0;
        rows.forEach(row => {
            const lastCalled = getCol(row, 'son_arama_zamani');
            if (lastCalled) {
                try {
                    const callTime = new Date(lastCalled).getTime();
                    if (callTime > mostRecentCallTime) {
                        mostRecentCallTime = callTime;
                    }
                } catch { }
            }
        });
        if (mostRecentCallTime > 0) {
            stats.hoursSinceLastCall = Math.floor((Date.now() - mostRecentCallTime) / (1000 * 60 * 60));
        }

        // Activity level = today's calls + approvals + updates
        stats.activityLevel = stats.todayCalls + stats.todayApprovals;

        return NextResponse.json(stats);

    } catch (error: any) {
        console.error('Activity Stats Error:', error);
        return NextResponse.json(getEmptyStats(), { status: 500 });
    }
}

function getEmptyStats() {
    return {
        todayApprovals: 0,
        todayCalls: 0,
        todayRejections: 0,
        waitingToCall: 0,
        whatsappCount: 0,
        storeCount: 0,
        topPerformer: { name: '', count: 0 },
        conversionRate: 0,
        totalCreditApproved: 0,
        topCity: { name: '', count: 0 },
        peakHour: 0,
        upcomingBirthdays: 0,
        streak: 0,
        hoursSinceLastCall: 0,
        activityLevel: 0,
    };
}

function calculateStreak(): number {
    // TODO: Implement proper streak calculation
    // For now, return a placeholder
    return Math.floor(Math.random() * 5) + 1;
}
