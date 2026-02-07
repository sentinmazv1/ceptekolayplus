
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
            riskyFollowUp: 0,
            attorneyPrep: 0,
            attorneyDelivered: 0
        };

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Count each lead ONLY ONCE with priority order
        (data || []).forEach(lead => {
            const status = lead.tahsilat_durumu || 'İşlem Bekliyor';
            const promiseDate = lead.odeme_sozu_tarihi?.split('T')[0];

            // Priority 1: Avukata Teslim Edildi
            if (status === 'Avukata Teslim Edildi') {
                stats.attorneyDelivered++;
            }
            // Priority 2: Avukata Hazırlık Aşaması
            else if (status === 'Avukata Hazırlık Aşaması') {
                stats.attorneyPrep++;
            }
            // Priority 3: Riskli Takip
            else if (status === 'Riskli Takip') {
                stats.riskyFollowUp++;
            }
            // Priority 4: Sözü Geçen (promise date exists AND is in the past)
            else if (promiseDate && promiseDate < todayStr) {
                stats.promiseExpired++;
            }
            // Priority 5: Ödeme Sözü Alındı (promise date exists AND is today or future)
            else if (status === 'Ödeme Sözü Alındı' && promiseDate && promiseDate >= todayStr) {
                stats.paymentPromised++;
            }
            // Priority 6: Ulaşılamayan (Ulaşılamadı OR İşlem Bekliyor)
            else if (status === 'Ulaşılamadı' || status === 'İşlem Bekliyor') {
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
