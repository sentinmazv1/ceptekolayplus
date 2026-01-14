
import { NextRequest, NextResponse } from 'next/server';
import { getReportData } from '@/lib/leads';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const customers = await getReportData();

        // Date Logic Check match report
        const trFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' });
        const todayStr = trFormatter.format(new Date());
        const start = new Date(todayStr).getTime();
        const end = new Date(todayStr).getTime() + (24 * 60 * 60 * 1000) - 1;

        // Filter for any customer that looks like they had an attorney query
        // Checks: avukat_sorgu_durumu is set, OR avukat_sorgu_sonuc is set
        const potentialQueries = customers.filter((c: any) =>
            c.avukat_sorgu_durumu || c.avukat_sorgu_sonuc
        ).map((c: any) => {
            const d = new Date(c.updated_at).getTime();
            return {
                id: c.id,
                name: c.ad_soyad,
                updated_at: c.updated_at,
                updated_at_ts: d,
                is_in_range_today: d >= start && d <= end,
                start_ts: start,
                end_ts: end,
                avukat_sorgu_durumu: c.avukat_sorgu_durumu,
                avukat_sorgu_sonuc: c.avukat_sorgu_sonuc,
                durum: c.durum
            };
        });

        // Sort by updated_at desc
        potentialQueries.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        return NextResponse.json({
            count: potentialQueries.length,
            today_match_count: potentialQueries.filter(q => q.is_in_range_today).length,
            debug_dates: { todayStr, start, end, serverTime: new Date().toISOString() },
            recent_20: potentialQueries.slice(0, 20),
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
