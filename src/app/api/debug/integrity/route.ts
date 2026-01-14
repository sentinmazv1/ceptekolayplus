
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // 1. Total Counts
        const { count: leadCount } = await supabaseAdmin.from('leads').select('*', { count: 'exact', head: true });
        const { count: logCount, data: sampleLogs } = await supabaseAdmin.from('activity_logs').select('*', { count: 'exact' }).limit(5);

        // 2. Check Linkage (How many logs have a valid customer_id?)
        // We fetch a few logs and check if their IDs exist in leads
        let sampleCheck: any[] = [];
        if (sampleLogs && sampleLogs.length > 0) {
            const ids = sampleLogs.map(l => l.customer_id);
            const { data: matchingLeads } = await supabaseAdmin.from('leads').select('id').in('id', ids);
            sampleCheck = sampleLogs.map(l => ({
                log_id: l.id,
                customer_id: l.customer_id,
                exists_in_leads: matchingLeads?.some(lead => lead.id === l.customer_id)
            }));
        }

        // 3. Check Recent Activity
        const { data: recentLogs } = await supabaseAdmin.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(5);

        return NextResponse.json({
            integrity: {
                total_leads: leadCount,
                total_logs: logCount,
                has_logs: (logCount || 0) > 0,
                sample_linkage_check: sampleCheck,
                last_5_logs_time: recentLogs?.map(l => l.created_at)
            },
            server_time: new Date().toISOString()
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
