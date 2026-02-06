
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Use EXACT same logic as /api/collection/stats
        const { data, error } = await supabaseAdmin
            .from('leads')
            .select('id, tahsilat_durumu, odeme_sozu_tarihi, sinif')
            .eq('sinif', 'Gecikme');

        if (error) {
            console.error('Collection service query error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Count by status (same as collection panel)
        const byStatus: Record<string, number> = {};
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        (data || []).forEach(lead => {
            const status = lead.tahsilat_durumu || 'İşlem Bekliyor';
            byStatus[status] = (byStatus[status] || 0) + 1;
        });

        // Map to report categories
        const stats = {
            totalFiles: data?.length || 0,
            paymentPromised: 0,
            unreachable: 0,
            promiseExpired: 0,
            attorneyPrep: 0,
            attorneyDelivered: 0
        };

        // Count "Ödeme Sözü Alındı" with date check
        (data || []).forEach(lead => {
            if (lead.tahsilat_durumu === 'Ödeme Sözü Alındı' && lead.odeme_sozu_tarihi) {
                const pDate = lead.odeme_sozu_tarihi.split('T')[0];
                if (pDate < todayStr) {
                    stats.promiseExpired++;
                } else {
                    stats.paymentPromised++;
                }
            }
        });

        // Map other statuses
        stats.unreachable = (byStatus['Ulaşılamadı'] || 0) + (byStatus['İşlem Bekliyor'] || 0) + (byStatus[''] || 0);
        stats.attorneyPrep = byStatus['Avukata Hazırlık Aşaması'] || 0;
        stats.attorneyDelivered = byStatus['Avukata Teslim Edildi'] || 0;

        return NextResponse.json({
            success: true,
            stats
        });

    } catch (error: any) {
        console.error('Collection service error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
