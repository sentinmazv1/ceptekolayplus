import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start') || new Date().toISOString().split('T')[0];
    const end = searchParams.get('end') || new Date().toISOString().split('T')[0];

    try {
        // 1. City Stats (RPC)
        const { data: cityStats, error: cityError } = await supabaseAdmin
            .rpc('get_collection_city_stats_v1', { start_date: start, end_date: end });

        if (cityError) throw cityError;

        // 2. Daily Stats (RPC)
        const { data: dailyStats, error: dailyError } = await supabaseAdmin
            .rpc('get_collection_daily_stats_v1', { start_date: start, end_date: end });

        if (dailyError) throw dailyError;

        return NextResponse.json({ success: true, cityStats, dailyStats });

    } catch (error: any) {
        console.error('Report API error:', error);
        // Fallback for missing RPC (Graceful degradation)
        if (error.message.includes('function') && error.message.includes('does not exist')) {
            return NextResponse.json({
                success: false,
                error: 'Database functions missing. Please run migration.',
                cityStats: [],
                dailyStats: []
            });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
