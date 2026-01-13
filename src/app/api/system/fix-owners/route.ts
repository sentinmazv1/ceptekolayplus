
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // 1. Fetch ALL leads to analyze in memory
        const { data: leads, error } = await supabaseAdmin
            .from('leads')
            .select('id, durum, sahip_email');

        if (error) throw error;
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
            // Note: 'Daha sonra aranmak istiyor' might be owned, leaving it alone for now.
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
            } else if (cleanStatus === 'Yeni') {
                // Explicit check for exact match if missed above (though includes covers it)
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
        const { error: updateError } = await supabaseAdmin
            .from('leads')
            .update({ sahip_email: null })
            .in('id', idsToClear);

        if (updateError) throw updateError;

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
