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

        // 3. Payment Stats (Simple Query)
        const { data: paymentsStats, error: payError } = await supabaseAdmin
            .from('leads')
            .select('id, ad_soyad, odeme_sozu_tarihi, tahsilat_durumu, sinif, telefon')
            .eq('sinif', 'Gecikme')
            .in('tahsilat_durumu', ['Ödeme Alındı', 'Kısmi Ödeme', 'Yapılandırma Yapıldı']) // Assuming these are positive statuses
            .gte('updated_at', `${start}T00:00:00`)
            .lte('updated_at', `${end}T23:59:59`)
            .order('updated_at', { ascending: false });

        // Note: Since we don't track "payment date" strictly separate from "updated_at" for status changes, 
        // relying on updated_at for the report window is the best approximation without a separate 'payments' table.

        return NextResponse.json({ success: true, cityStats, dailyStats, paymentsStats: paymentsStats || [] });

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
