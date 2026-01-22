
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/leads'; // Assuming this is where it is exported, based on previous file views

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Find Lead by Phone
        const { data: lead, error: leadError } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('telefon', '5073993895') // The number user provided
            .single();

        if (leadError || !lead) {
            return NextResponse.json({ error: 'Lead not found', details: leadError });
        }

        // 2. Fetch Logs for this Lead
        const { data: logs, error: logsError } = await supabaseAdmin
            .from('activity_logs')
            .select('*')
            .eq('lead_id', lead.id)
            .order('created_at', { ascending: false });

        return NextResponse.json({
            lead_summary: {
                id: lead.id,
                ad_soyad: lead.ad_soyad,
                durum: lead.durum,
                created_at: lead.created_at
            },
            logs: logs
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack });
    }
}
