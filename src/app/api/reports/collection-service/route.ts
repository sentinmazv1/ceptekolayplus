
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

        const startIso = new Date(startDate).toISOString();
        const endIso = new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString();

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
            const tahsilatDurumu = (lead.tahsilat_durumu || '').toLowerCase();

            if (tahsilatDurumu.includes('ödeme sözü') || tahsilatDurumu.includes('odeme sozu')) {
                stats.paymentPromised++;
            } else if (tahsilatDurumu.includes('ulaşılamadı') || tahsilatDurumu.includes('ulasilamadi')) {
                stats.unreachable++;
            } else if (tahsilatDurumu.includes('sözü geçti') || tahsilatDurumu.includes('sozu gecti') || tahsilatDurumu.includes('vade geçti')) {
                stats.promiseExpired++;
            } else if (tahsilatDurumu.includes('avukat hazırlık') || tahsilatDurumu.includes('avukata hazırlık')) {
                stats.attorneyPrep++;
            } else if (tahsilatDurumu.includes('avukata teslim') || tahsilatDurumu.includes('avukata gönderildi')) {
                stats.attorneyDelivered++;
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
