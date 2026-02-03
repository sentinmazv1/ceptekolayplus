import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateLead, getLeads, getLead } from '@/lib/leads';
import { Customer } from '@/lib/types';
import { supabaseAdmin } from '@/lib/supabase'; // Added for direct DB insert

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const lead = await getLead(params.id);
        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }
        return NextResponse.json({ lead });
    } catch (error) {
        console.error('Fetch lead error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body: Customer = await req.json();

        // Check if status changed
        const leads = await getLeads();
        const existing = leads.find(l => l.id === params.id);

        // Update the lead
        const updated = await updateLead(body, session.user.email);

        // --- SMS LOGIC & REPORTS LOGGING ---
        if (existing && existing.durum !== updated.durum) {
            const { logAction } = await import('@/lib/leads'); // Ensure import

            // Log the Status Change
            await logAction({
                log_id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                user_email: session.user.email,
                customer_id: updated.id,
                action: 'UPDATE_STATUS', // Crucial for Reports
                old_value: existing.durum,
                new_value: updated.durum,
                note: 'Status updated via detailed view',
                metadata: {
                    // Capture Context for "Time Travel" reporting
                    source: 'detailed_view',
                    ...(updated.durum === 'Teslim edildi' || updated.durum === 'Satış yapıldı/Tamamlandı' ? {
                        delivery_snapshot: {
                            items: updated.satilan_urunler,
                            total_revenue: updated.talep_edilen_tutar || updated.kredi_limiti,
                            seller: session.user.email,
                            date: new Date().toISOString()
                        }
                    } : {})
                }
            });

            const status = updated.durum;
            let smsMessage = null;
            const { SMS_TEMPLATES } = await import('@/lib/sms-templates'); // Lazy load
            const { sendSMS } = await import('@/lib/sms'); // Lazy load

            if (status === 'Ulaşılamadı' || status === 'Cevap Yok') {
                smsMessage = SMS_TEMPLATES.UNREACHABLE(updated.ad_soyad);
            } else if (status === 'Kefil bekleniyor' || updated.onay_durumu === 'Kefil İstendi') {
                smsMessage = SMS_TEMPLATES.GUARANTOR_REQUIRED(updated.ad_soyad);
            } else if (status === 'Onaylandı') {
                const limit = updated.kredi_limiti || '0';
                smsMessage = SMS_TEMPLATES.APPROVED(updated.ad_soyad, limit);
            } else if (status === 'Eksik evrak bekleniyor') {
                smsMessage = SMS_TEMPLATES.MISSING_DOCS(updated.ad_soyad);
            } else if (status === 'İptal/Vazgeçti') {
                smsMessage = SMS_TEMPLATES.CANCELLED(updated.ad_soyad);
            }

            if (smsMessage && updated.telefon) {
                console.log('Skipping Auto-SMS (Manual Mode Active):', smsMessage);
            }
        }

        // --- ATTORNEY HISTORY TRACKING (New WhatsApp-style Flow) ---
        // 1. Customer Attorney Status
        if (existing && existing.avukat_sorgu_durumu !== updated.avukat_sorgu_durumu) {
            // Also standard log
            const { logAction } = await import('@/lib/leads');
            await logAction({
                log_id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                user_email: session.user.email,
                customer_id: updated.id,
                action: 'UPDATE_FIELDS',
                old_value: existing.avukat_sorgu_durumu || '',
                new_value: updated.avukat_sorgu_durumu || '',
                note: 'Avukat Sorgu Durumu Updated'
            });

            // Insert into HISTORY table
            await supabaseAdmin.from('attorney_status_history').insert({
                lead_id: updated.id,
                old_status: existing.avukat_sorgu_durumu,
                new_status: updated.avukat_sorgu_durumu,
                old_result: existing.avukat_sorgu_sonuc,
                new_result: updated.avukat_sorgu_sonuc,
                changed_by: session.user.email,
                metadata: { type: 'customer' }
            });
        }

        // 2. Guarantor Attorney Status (Kefil)
        if (existing && existing.kefil_avukat_sorgu_durumu !== updated.kefil_avukat_sorgu_durumu) {
            const { logAction } = await import('@/lib/leads');
            await logAction({
                log_id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                user_email: session.user.email,
                customer_id: updated.id,
                action: 'UPDATE_FIELDS',
                old_value: existing.kefil_avukat_sorgu_durumu || '',
                new_value: updated.kefil_avukat_sorgu_durumu || '',
                note: 'Kefil Avukat Sorgu Durumu Updated'
            });

            // Insert into HISTORY table
            await supabaseAdmin.from('attorney_status_history').insert({
                lead_id: updated.id,
                old_status: existing.kefil_avukat_sorgu_durumu,
                new_status: updated.kefil_avukat_sorgu_durumu,
                old_result: existing.kefil_avukat_sorgu_sonuc,
                new_result: updated.kefil_avukat_sorgu_sonuc,
                changed_by: session.user.email,
                metadata: { type: 'guarantor' }
            });
        }


        // Also check if approval status changed explicitly to 'Kefil İstendi' even if main status didn't change (edge case)
        if (existing && existing.onay_durumu !== updated.onay_durumu && updated.onay_durumu === 'Kefil İstendi' && existing.durum === updated.durum) {
            const { SMS_TEMPLATES } = await import('@/lib/sms-templates');
            const { sendSMS } = await import('@/lib/sms');
            const { logAction } = await import('@/lib/leads');
            const msg = SMS_TEMPLATES.GUARANTOR_REQUIRED(updated.ad_soyad);
            if (updated.telefon) {
                await logAction({
                    log_id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    user_email: session.user.email,
                    customer_id: updated.id,
                    action: 'SEND_SMS',
                    note: `Onay Durumu: Kefil İstendi`,
                    new_value: msg
                });
            }
        }

        return NextResponse.json({ lead: updated });
    } catch (error: any) {
        console.error('Update Validation Error Details:', JSON.stringify(error, null, 2));
        console.error('Update Error Message:', error.message);

        return NextResponse.json(
            {
                message: error.message || 'Update failed',
                details: error.details || error.hint || 'No specific details'
            },
            { status: 500 }
        );
    }
}
