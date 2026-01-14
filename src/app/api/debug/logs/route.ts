
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Fetch last 20 logs raw, without any confusing mapping
        const { data, error } = await supabaseAdmin
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            return NextResponse.json({ error }, { status: 500 });
        }

        // Return raw data to see timestamps and structure
        return NextResponse.json({
            count: data.length,
            sample: data,
            serverTime: new Date().toISOString()
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
