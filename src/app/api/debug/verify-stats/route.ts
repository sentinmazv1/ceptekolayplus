
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const todayStr = startOfDay.split('T')[0];

        // 1. Total Count
        const { count: total, error: err1 } = await supabaseAdmin.from('leads').select('*', { count: 'exact', head: true });

        // 2. Status 'Yeni'
        const { count: yeni, error: err2 } = await supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('durum', 'Yeni');

        // 3. Status 'Onaylandı'
        const { count: approved, error: err3 } = await supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('durum', 'Onaylandı');

        // 4. Logs Today (PULL_LEAD)
        const { count: logsToday, error: err4 } = await supabaseAdmin.from('activity_logs')
            .select('*', { count: 'exact', head: true })
            .ilike('created_at', `${todayStr}%`)
            .eq('action', 'PULL_LEAD');

        // 5. Raw Status Grouping (Top 10)
        const { data: statusGroups, error: err5 } = await supabaseAdmin.rpc('get_status_counts');
        // Note: rpc might not exist, so let's try a manual group if we could, but Supabase client doesn't support .groupBy easily without rpc.
        // Let's just return the raw counts we got.

        return NextResponse.json({
            success: true,
            check_time: new Date().toISOString(),
            raw_db_stats: {
                total_rows: total,
                status_yeni: yeni,
                status_onaylandi: approved,
                logs_pull_lead_today: logsToday
            },
            notes: "Compare these 'raw' numbers with your Reports Dashboard. 'Total Rows' should match 'Toplam Başvuru' (approx). 'Logs Pull Lead' should match 'Bugün Aranan' (approx)."
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
