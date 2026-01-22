
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get('type'); // 'status' | 'date'
    const filterValue = searchParams.get('value');

    try {
        let query = supabaseAdmin
            .from('leads')
            .select('*')
            .eq('sinif', 'Gecikme')
            .order('son_arama_zamani', { ascending: true, nullsFirst: true });

        if (filterType === 'status') {
            if (filterValue === 'İşlem Bekliyor') {
                query = query.is('tahsilat_durumu', null);
            } else {
                query = query.eq('tahsilat_durumu', filterValue);
            }
        } else if (filterType === 'date') {
            // value = 'today' | 'tomorrow' | 'overdue'
            const today = new Date().toISOString().split('T')[0];
            const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];

            if (filterValue === 'today') query = query.ilike('odeme_sozu_tarihi', `${today}%`);
            else if (filterValue === 'tomorrow') query = query.ilike('odeme_sozu_tarihi', `${tomorrow}%`);
            else if (filterValue === 'overdue') query = query.lt('odeme_sozu_tarihi', today);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true, leads: data });

    } catch (error: any) {
        console.error('Collection list error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
