
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Use EXACT same logic as collection panel
        const { data, error } = await supabaseAdmin
            .from('leads')
            .select('id, tahsilat_durumu, odeme_sozu_tarihi, sinif')
            .eq('sinif', 'Gecikme');

        if (error) {
            console.error('Collection service query error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const stats = {
            totalFiles: data?.length || 0,
            paymentPromised: 0,
            unreachable: 0,
            promiseExpired: 0,
            attorneyPrep: 0,
            attorneyDelivered: 0
        };

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Count by status
        const byStatus: Record<string, number> = {};
        (data || []).forEach(lead => {
            const status = lead.tahsilat_durumu || 'İşlem Bekliyor';
            byStatus[status] = (byStatus[status] || 0) + 1;
        });

        // SÖZÜ GEÇEN: Collection panel mantığı - SADECE tarih kontrolü
        // tahsilat_durumu kontrolü YOK!
        (data || []).forEach(lead => {
            if (lead.odeme_sozu_tarihi && lead.odeme_sozu_tarihi.split('T')[0] < todayStr) {
                stats.promiseExpired++;
            }
        });

        // ÖDEME SÖZÜ: "Ödeme Sözü Alındı" + tarih bugün veya gelecek
        (data || []).forEach(lead => {
            if (lead.tahsilat_durumu === 'Ödeme Sözü Alındı' && lead.odeme_sozu_tarihi) {
                const pDate = lead.odeme_sozu_tarihi.split('T')[0];
                if (pDate >= todayStr) {
                    stats.paymentPromised++;
                }
            }
        });

        // Diğer durumlar
        stats.unreachable = (byStatus['Ulaşılamadı'] || 0) + (byStatus['İşlem Bekliyor'] || 0);
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
