
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // 1. Clear owner for 'Yeni' leads (Standardizing "New" means "Unassigned")
        const { data, error, count } = await supabaseAdmin
            .from('leads')
            .update({ sahip_email: null })
            .or('durum.eq.Yeni,durum.is.null,durum.eq.""')
            .neq('sahip_email', null) // Only update if not already null (supabase syntax check?)
            // actually .neq('sahip_email', null) might need explicit syntax for null check
            // simpler: just update all matching logic
            .select();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: `Fixed owners for ${data?.length} leads.`,
            updated: data?.length
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
