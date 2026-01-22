
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // 1. Fetch ALL 'Gecikme' leads (lightweight fetch for stats)
        const { data, error } = await supabaseAdmin
            .from('leads')
            .select('id, tahsilat_durumu, odeme_sozu_tarihi, sinif')
            .eq('sinif', 'Gecikme');

        if (error) throw error;

        const stats = {
            total: 0,
            byStatus: {} as Record<string, number>,
            promises: {
                today: 0,
                tomorrow: 0,
                overdue: 0
            }
        };

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        (data || []).forEach(lead => {
            stats.total++;

            // Status Breakdown
            const status = lead.tahsilat_durumu || 'İşlem Bekliyor';
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

            // Promise Dates
            if (lead.odeme_sozu_tarihi) {
                const pDate = lead.odeme_sozu_tarihi.split('T')[0];
                if (pDate === todayStr) stats.promises.today++;
                else if (pDate === tomorrowStr) stats.promises.tomorrow++;
                else if (pDate < todayStr) stats.promises.overdue++;
            }
        });

        return NextResponse.json({ success: true, stats });

    } catch (error: any) {
        console.error('Collection stats error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
