
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    console.log('Force Re-Deploy: Fix Daily Stats');
    const { searchParams } = new URL(req.url);
    const confirm = searchParams.get('confirm') === 'true';

    // 1. Find leads delivered TODAY (Istanbul time)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // UTC date part, close enough for "Starts With"

    // Better: Istanbul Date String
    const istDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(today);

    try {
        const { data, error } = await supabaseAdmin
            .from('leads')
            .select('id, ad_soyad, durum, teslim_tarihi, created_at, urun_imei, sinif')
            .or('durum.eq.Teslim edildi,durum.eq.Satış yapıldı/Tamamlandı')
            .ilike('teslim_tarihi', `${istDate}%`);

        if (error) throw error;

        // Filter for "False Positives"
        // Heuristic: If it has NO IMEI (and is Delivered), it's likely a legacy record that got updated incorrectly.
        // OR if created_at is OLD (> 1 day ago) and it just got delivered?
        // Real delivery today IS possible for old lead. 
        // But user said 7 are wrong.
        // The wrong ones likely have NO IMEI because my pre-patch CustomerCard allowed saving them without IMEI.
        // The CORRECT ones (2) likely HAVE IMEI (or were just entered correctly).

        const candidates = data || [];
        const toFix = candidates.filter(l => !l.urun_imei); // No IMEI = Suspect

        const valid = candidates.filter(l => l.urun_imei);

        if (!confirm) {
            return NextResponse.json({
                message: 'Dry Run',
                stats: {
                    total_found_today: candidates.length,
                    likely_false_positives: toFix.length,
                    likely_real: valid.length
                },
                to_fix_preview: toFix.map(l => `${l.ad_soyad} (${l.durum}) - ID: ${l.id}`),
                action: 'Append ?confirm=true to fix.'
            });
        }

        // FIX: Set teslim_tarihi to NULL for the suspects
        const idsToReset = toFix.map(l => l.id);

        if (idsToReset.length > 0) {
            const { error: updateError } = await supabaseAdmin
                .from('leads')
                .update({ teslim_tarihi: null })
                .in('id', idsToReset);

            if (updateError) throw updateError;
        }

        return NextResponse.json({
            success: true,
            fixed_count: idsToReset.length,
            fixed_ids: idsToReset
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
