
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('attorney_status_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        return NextResponse.json({
            success: true,
            data,
            error: error ? error.message : null
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
