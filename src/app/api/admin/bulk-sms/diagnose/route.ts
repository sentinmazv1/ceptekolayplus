import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    try {
        // 1. Get raw counts from leads table
        const { data: leads, error: leadsError } = await supabaseAdmin
            .from('leads')
            .select('durum');

        if (leadsError) throw leadsError;

        // Group and count manually (since Supabase select count is simpler this way for debugging)
        const counts: Record<string, number> = {};
        leads.forEach((l: any) => {
            const s = l.durum;
            counts[s] = (counts[s] || 0) + 1;
        });

        // 2. Get defined statuses
        const { data: statuses, error: statusError } = await supabaseAdmin
            .from('statuses')
            .select('*');

        return NextResponse.json({
            success: true,
            db_counts: counts,
            defined_statuses: statuses
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message });
    }
}
