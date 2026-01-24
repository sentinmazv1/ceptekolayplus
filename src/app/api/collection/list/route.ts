
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
            .select('*', { count: 'exact' })
            .eq('sinif', 'Gecikme')
            .order('son_arama_zamani', { ascending: true, nullsFirst: true });

        // Default Limit 1000 is too small for total list, so we paginate.
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        if (filterType === 'status') {
            if (filterValue === 'İşlem Bekliyor') {
                // Simplified to IS NULL to avoid OR syntax issues
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

        // Get Data with range AND Count in one go
        const { data, error, count } = await query.range(offset, offset + limit - 1);
        if (error) throw error;

        return NextResponse.json({
            success: true,
            leads: data,
            meta: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (error: any) {
        console.error('Collection list error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
