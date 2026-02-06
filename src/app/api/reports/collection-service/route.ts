
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Collection service stats are ALWAYS current, not date-filtered
        // This shows the real-time status of all collection files
        // IMPORTANT: Must match the collection panel filter (sinif = 'Gecikme')

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

        // Date calculation for promise expiry
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        (leads || []).forEach((lead: any) => {
            stats.totalFiles++;

            // Get exact tahsilat_durumu value
            const tahsilatDurumu = (lead.tahsilat_durumu || '').trim();
            const promiseDate = lead.odeme_sozu_tarihi ? lead.odeme_sozu_tarihi.split('T')[0] : null;

            // Categorize based on exact database values
            if (tahsilatDurumu === 'Ödeme Sözü Alındı' && promiseDate && promiseDate < todayStr) {
                // Sözü Geçen: "Ödeme Sözü Alındı" with expired date
                stats.promiseExpired++;
            } else if (tahsilatDurumu === 'Ödeme Sözü Alındı' && promiseDate && promiseDate >= todayStr) {
                // Ödeme Sözü: "Ödeme Sözü Alındı" with future/today date
                stats.paymentPromised++;
            } else if (tahsilatDurumu === 'Ulaşılamadı') {
                // Ulaşılamayan
                stats.unreachable++;
            } else if (tahsilatDurumu === 'Avukata Hazırlık Aşaması') {
                // Avukata Hazırlık
                stats.attorneyPrep++;
            } else if (tahsilatDurumu === 'Avukata Teslim Edildi') {
                // Avukata Teslim
                stats.attorneyDelivered++;
            } else if (!tahsilatDurumu || tahsilatDurumu === '' || tahsilatDurumu === 'Seçiniz...') {
                // No status set - count as unreachable
                stats.unreachable++;
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
