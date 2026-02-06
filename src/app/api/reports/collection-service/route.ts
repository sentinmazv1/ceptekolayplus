
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Collection service stats are ALWAYS current, not date-filtered
        // This shows the real-time status of all collection files
        // IMPORTANT: Must match the collection panel filter (sinif = 'Gecikme')

        // Fetch collection statuses for proper categorization
        const { data: collectionStatuses } = await supabaseAdmin
            .from('collection_statuses')
            .select('label')
            .order('sort_order', { ascending: true });

        // Fetch all leads with sinif = 'Gecikme' (same as collection panel)
        const { data: leads, error: fetchError } = await supabaseAdmin
            .from('leads')
            .select('id, ad_soyad, durum, tahsilat_durumu, sinif, odeme_sozu_tarihi, created_at, updated_at')
            .eq('sinif', 'Gecikme');

        if (fetchError) {
            console.error('Collection service query error:', fetchError);
            return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
        }

        const stats = {
            totalFiles: 0,
            paymentPromised: 0,
            unreachable: 0,
            promiseExpired: 0,
            attorneyPrep: 0,
            attorneyDelivered: 0
        };

        // Date calculation for promise expiry (same as collection panel)
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        (leads || []).forEach((lead: any) => {
            stats.totalFiles++;

            // Get exact tahsilat_durumu value
            const tahsilatDurumu = (lead.tahsilat_durumu || '').trim();

            // Check if promise is expired based on date (same as collection panel)
            const hasExpiredPromise = lead.odeme_sozu_tarihi && lead.odeme_sozu_tarihi.split('T')[0] < todayStr;

            if (hasExpiredPromise) {
                // Date-based: promise date is in the past
                stats.promiseExpired++;
            } else if (!tahsilatDurumu || tahsilatDurumu === '' || tahsilatDurumu === 'İşlem Bekliyor') {
                // No status set - count as unreachable or pending
                stats.unreachable++;
            } else if (tahsilatDurumu === 'Ödeme Sözü Alındı' || tahsilatDurumu === 'Ödeme Sözü') {
                stats.paymentPromised++;
            } else if (tahsilatDurumu === 'Ulaşılamadı' || tahsilatDurumu === 'Ulaşılamıyor') {
                stats.unreachable++;
            } else if (tahsilatDurumu === 'Avukata Hazırlık' || tahsilatDurumu === 'Avukat Hazırlığı') {
                stats.attorneyPrep++;
            } else if (tahsilatDurumu === 'Avukata Teslim Edildi' || tahsilatDurumu === 'Avukata Teslim') {
                stats.attorneyDelivered++;
            } else {
                // Other statuses - categorize as unreachable for now
                stats.unreachable++;
            }
        });

        return NextResponse.json({
            success: true,
            stats
        });

    } catch (error: any) {
        console.error('Collection service error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
