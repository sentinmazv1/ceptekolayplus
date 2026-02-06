
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, error: 'Dates required' }, { status: 400 });
        }

        // Fetch all leads with "Tahsilat servisi" status
        const { data: leads, error } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('durum', 'Tahsilat servisi');

        if (error) {
            console.error('Collection service query error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const stats = {
            totalFiles: 0,
            paymentPromised: 0,
            unreachable: 0,
            promiseExpired: 0,
            attorneyPrep: 0,
            attorneyDelivered: 0
        };

        leads?.forEach((lead: any) => {
            stats.totalFiles++;

            // Categorize based on tahsilat_durumu field
            const tahsilatDurumu = (lead.tahsilat_durumu || '').toLowerCase().trim();

            if (!tahsilatDurumu || tahsilatDurumu === '') {
                // No status set - count as unreachable or pending
                stats.unreachable++;
            } else if (tahsilatDurumu.includes('ödeme sözü') || tahsilatDurumu.includes('odeme sozu') || tahsilatDurumu.includes('söz alındı')) {
                stats.paymentPromised++;
            } else if (tahsilatDurumu.includes('ulaşılamadı') || tahsilatDurumu.includes('ulasilamadi') || tahsilatDurumu.includes('cevap yok')) {
                stats.unreachable++;
            } else if (tahsilatDurumu.includes('sözü geçti') || tahsilatDurumu.includes('sozu gecti') || tahsilatDurumu.includes('vade geçti') || tahsilatDurumu.includes('vade gecti')) {
                stats.promiseExpired++;
            } else if (tahsilatDurumu.includes('avukat hazırlık') || tahsilatDurumu.includes('avukata hazırlık') || tahsilatDurumu.includes('avukat hazirligi')) {
                stats.attorneyPrep++;
            } else if (tahsilatDurumu.includes('avukata teslim') || tahsilatDurumu.includes('avukata gönderildi') || tahsilatDurumu.includes('avukata gitti')) {
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
