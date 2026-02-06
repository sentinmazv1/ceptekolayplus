
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Collection service stats are ALWAYS current, not date-filtered
        // This shows the real-time status of all collection files

        // Fetch all leads with collection service status
        const { data: allLeads, error: fetchError } = await supabaseAdmin
            .from('leads')
            .select('id, ad_soyad, durum, tahsilat_durumu, created_at, updated_at');

        if (fetchError) {
            console.error('Collection service query error:', fetchError);
            return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
        }

        // Filter for collection service leads (handle multiple status variations)
        const leads = allLeads?.filter((lead: any) => {
            const durum = (lead.durum || '').toLowerCase();
            return durum.includes('tahsilat') || durum === 'tahsilat servisi' || durum === 'tahsilat servisinde';
        }) || [];

        const stats = {
            totalFiles: 0,
            paymentPromised: 0,
            unreachable: 0,
            promiseExpired: 0,
            attorneyPrep: 0,
            attorneyDelivered: 0
        };

        leads.forEach((lead: any) => {
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
