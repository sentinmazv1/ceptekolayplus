import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateLead, getLeads } from '@/lib/leads';
import { Customer } from '@/lib/types';
import { sendStatusEmail } from '@/lib/email-service';

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

        // Send email if status changed (Legacy Email Logic commented out)
        /* 
        if (existing && existing.durum !== updated.durum) {
            await sendStatusEmail(updated, updated.durum);
        } 
        */

        // --- SMS LOGIC ---
        // Check if status changed
        // Match logs for Reports (Applications, etc.)
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
                note: 'Status updated via detailed view'
            });

            const status = updated.durum;
            let smsMessage = null;

            // Import dynamically or at top. Using dynamic for now to keep cleaner diff
            const { SMS_TEMPLATES } = await import('@/lib/sms-templates');
            const { sendSMS } = await import('@/lib/sms');

            if (status === 'Ulaşılamadı' || status === 'Cevap Yok') {
                smsMessage = SMS_TEMPLATES.UNREACHABLE(updated.ad_soyad);
            } else if (status === 'Kefil bekleniyor' || updated.onay_durumu === 'Kefil İstendi') {
                // Determine if it was explicit status or approval workflow
                smsMessage = SMS_TEMPLATES.GUARANTOR_REQUIRED(updated.ad_soyad);
            } else if (status === 'Onaylandı') {
                // Check if actually approved in workflow
                const limit = updated.kredi_limiti || '0';
                smsMessage = SMS_TEMPLATES.APPROVED(updated.ad_soyad, limit);
            } else if (status === 'Eksik evrak bekleniyor') {
                smsMessage = SMS_TEMPLATES.MISSING_DOCS(updated.ad_soyad);
            } else if (status === 'İptal/Vazgeçti') {
                smsMessage = SMS_TEMPLATES.CANCELLED(updated.ad_soyad);
            }

            if (smsMessage && updated.telefon) {
                // MANUAL MODE (User Request: Do not send automatically for now)
                /* 
                const sent = await sendSMS(updated.telefon, smsMessage);
                if (sent) {
                    await logAction({
                        log_id: crypto.randomUUID(),
                        timestamp: new Date().toISOString(),
                        user_email: session.user.email,
                        customer_id: updated.id,
                        action: 'SEND_SMS',
                        note: `Durum: ${status} (Otomatik)`,
                        new_value: smsMessage
                    });
                }
                */
                console.log('Skipping Auto-SMS (Manual Mode Active):', smsMessage);
            }
        }

        // Detect Attorney Query Updates
        if (existing && existing.avukat_sorgu_durumu !== updated.avukat_sorgu_durumu) {
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
        }


        // Also check if approval status changed explicitly to 'Kefil İstendi' even if main status didn't change (edge case)
        if (existing && existing.onay_durumu !== updated.onay_durumu && updated.onay_durumu === 'Kefil İstendi' && existing.durum === updated.durum) {
            const { SMS_TEMPLATES } = await import('@/lib/sms-templates');
            const { sendSMS } = await import('@/lib/sms');
            const { logAction } = await import('@/lib/leads');

            const msg = SMS_TEMPLATES.GUARANTOR_REQUIRED(updated.ad_soyad);
            if (updated.telefon) {
                await sendSMS(updated.telefon, msg);
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
