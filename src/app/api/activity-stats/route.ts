
import { NextResponse } from 'next/server';
import { getLeads, getAllLogs } from '@/lib/leads';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Fetch data from Supabase
        const [leads, logs] = await Promise.all([
            getLeads(),
            getAllLogs() // We might want to limit this to 'today' for performance if it gets huge, but for now full fetch is ok for stats
        ]);

        const trFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Istanbul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        const today = trFormatter.format(new Date());

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
            hoursSinceLastCall: 0,
            activityLevel: 0,
        };

        const cityCount: Record<string, number> = {};
        const hourCalls: Record<number, number> = {};
        const performerCounts: Record<string, number> = {};

        // Analyze Leads
        leads.forEach(lead => {
            // Today's Approvals
            if (lead.onay_tarihi) {
                try {
                    const onayDay = trFormatter.format(new Date(lead.onay_tarihi));
                    if (onayDay === today && lead.onay_durumu === 'Onaylandı') {
                        stats.todayApprovals++;
                        if (lead.kredi_limiti) {
                            stats.totalCreditApproved += parseFloat(lead.kredi_limiti.replace(/[^0-9]/g, '') || '0');
                        }
                    }
                } catch (e) { }
            }

            // Today's Rejections
            if (lead.durum === 'Reddetti' || lead.onay_durumu === 'Reddedildi') {
                // Check if it happened today? Currently logic just checks status. 
                // Original code checked logic based on status but didn't strictly check date for 'Rejections' in the loop properly?
                // Re-reading original: "if (status === 'Reddetti'...) stats.todayRejections++". 
                // Wait, that counts TOTAL rejections as "todayRejections"? That seems like a bug in original code or I misread.
                // It says "Today's rejections" comment.
                // To be safe, let's keep it simple: if 'updated_at' is today AND status is rejected? 
                // Or just count all for now to match behavior until fixed.
                // Let's assume the user meant "Total Rejections" or "Today". 
                // I will try to use update time if available, otherwise just count.
                if (lead.updated_at) {
                    const updateDay = trFormatter.format(new Date(lead.updated_at));
                    if (updateDay === today) stats.todayRejections++;
                }
            }

            // Waiting to call
            if (lead.durum === 'Yeni' || lead.durum === 'Aranacak') {
                stats.waitingToCall++;
            }

            // Channel
            const channel = lead.basvuru_kanali;
            if (channel === 'WhatsApp' || channel === 'Whatsapp') {
                stats.whatsappCount++;
            } else if (channel === 'Mağaza' || channel === 'Store') {
                stats.storeCount++;
            }

            // City
            if (lead.sehir) {
                cityCount[lead.sehir] = (cityCount[lead.sehir] || 0) + 1;
            }

            // Performer
            if (lead.sahip && lead.onay_durumu === 'Onaylandı') {
                performerCounts[lead.sahip] = (performerCounts[lead.sahip] || 0) + 1;
            }
        });

        // Analyze Logs for Calls
        logs.forEach(log => {
            // Today's Calls: inferred from PULL_LEAD or specific actions today
            if (log.timestamp) {
                const logDay = trFormatter.format(new Date(log.timestamp));
                if (logDay === today) {
                    if (log.action === 'PULL_LEAD' || log.action === 'SEND_WHATSAPP') {
                        stats.todayCalls++;
                        // Peak Hour
                        try {
                            const hour = new Date(log.timestamp).getHours();
                            hourCalls[hour] = (hourCalls[hour] || 0) + 1;
                        } catch { }
                    }
                }
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
                topName = name.split('@')[0];
            }
        }
        stats.topPerformer = { name: topName, count: maxCount };

        // Conversion
        if (leads.length > 0) {
            stats.conversionRate = Math.round((stats.todayApprovals / leads.length) * 100);
        }

        stats.streak = 5; // Placeholder
        stats.activityLevel = stats.todayCalls + stats.todayApprovals;

        return NextResponse.json(stats);

    } catch (error: any) {
        console.error('Activity Stats Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
