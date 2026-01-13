
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Helper for recursive fetch
async function fetchAll(queryBuilder: any) {
    let allRows: any[] = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await queryBuilder
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allRows = allRows.concat(data);
        if (data.length < pageSize) break;
        page++;
    }
    return allRows;
}

export async function GET(req: Request) {
    try {
        // 1. Fetch ALL leads to analyze in memory
        const query = supabaseAdmin.from('leads').select('id, durum, sahip_email');
        const leads = await fetchAll(query);

        if (!leads) return NextResponse.json({ message: 'No leads found' });

        const idsToClear: string[] = [];
        const stats: Record<string, number> = {};

        // Statuses that should NOT have an owner (Pool eligible or Dead)
        const unownedStatuses = [
            'Yeni',
            'Ulaşılamadı',
            'Meşgul/Hattı kapalı',
            'Cevap Yok',
            'Yanlış numara',
            'Uygun değil',
            'İptal/Vazgeçti',
            'Numara kullanılmıyor',
        ];

        leads.forEach(lead => {
            const cleanStatus = (lead.durum || '').trim();

            // Check if this status implies it should be unowned
            if (unownedStatuses.includes(cleanStatus) || cleanStatus === '') {
                // If it currently has an owner, mark for clearing
                if (lead.sahip_email && lead.sahip_email.length > 0) {
                    idsToClear.push(lead.id);
                    stats[cleanStatus || 'EMPTY'] = (stats[cleanStatus || 'EMPTY'] || 0) + 1;
                }
            }
        });

        if (idsToClear.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No inconsistencies found. All pool statuses are already unowned.',
                scanned: leads.length
            });
        }

        // 2. Bulk Update
        // Supabase 'in' filter also has limits (URL length)? 
        // 344 IDs might be fine. If thousands, we might need to batch update.
        // Let's do batch update for safety.

        const updateBatchSize = 100;
        let updateCount = 0;

        for (let i = 0; i < idsToClear.length; i += updateBatchSize) {
            const batchIds = idsToClear.slice(i, i + updateBatchSize);
            const { error: updateError } = await supabaseAdmin
                .from('leads')
                .update({ sahip_email: null })
                .in('id', batchIds);

            if (updateError) throw updateError;
            updateCount += batchIds.length;
        }

        return NextResponse.json({
            success: true,
            message: `Cleared owners for ${idsToClear.length} leads.`,
            breakdown: stats,
            scanned: leads.length
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
