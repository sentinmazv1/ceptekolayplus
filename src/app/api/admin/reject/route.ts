import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateLead, getLead, logAction } from '@/lib/leads';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Forbidden - Admin only' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { customerId, reason, action } = body;

        console.log('Reject/Guarantor request:', { customerId, reason, action });

        if (!customerId || !action) {
            console.error('Missing fields:', { customerId, action });
            return NextResponse.json({ message: 'customerId ve action gerekli' }, { status: 400 });
        }

        // Fetch the customer directly
        const customer = await getLead(customerId);

        if (!customer) {
            return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
        }

        const now = new Date().toISOString();
        let newStatus = customer.durum;
        let onayDurumu = customer.onay_durumu;

        if (action === 'reject') {
            newStatus = 'Reddetti';
            onayDurumu = 'Reddedildi';
        } else if (action === 'request_guarantor') {
            newStatus = 'Kefil bekleniyor';
            onayDurumu = 'Kefil İstendi';
        }

        // Update with rejection/guarantor request
        const updated = await updateLead({
            ...customer,
            durum: newStatus,
            onay_durumu: onayDurumu,
            admin_notu: reason || '',
            onay_tarihi: now,
            onaylayan_admin: session.user.email
        }, session.user.email);

        // Log action
        await logAction({
            log_id: crypto.randomUUID(),
            timestamp: now,
            user_email: session.user.email,
            customer_id: customerId,
            action: 'UPDATE_STATUS',
            old_value: customer.durum,
            new_value: newStatus,
            note: reason || ''
        });

        // --- SMS TRIGGER ---
        if (action === 'request_guarantor') {
            const { SMS_TEMPLATES } = await import('@/lib/sms-templates');
            const { sendSMS } = await import('@/lib/sms');

            const msg = SMS_TEMPLATES.GUARANTOR_REQUIRED(customer.ad_soyad);

            if (customer.telefon) {
                // MANUAL MODE
                /*
                const sent = await sendSMS(customer.telefon, msg);
                if (sent) {
                    await logAction({
                        log_id: crypto.randomUUID(),
                        timestamp: new Date().toISOString(),
                        user_email: session.user.email,
                        customer_id: customerId,
                        action: 'SEND_SMS',
                        note: 'Yönetici - Kefil İstendi',
                        new_value: msg
                    });
                }
                */
                console.log('Skipping Auto-SMS (Manual Mode Active):', msg);
            }
        }

        return NextResponse.json({ lead: updated });
    } catch (error: any) {
        console.error('Reject/Request error:', error);
        return NextResponse.json(
            { message: error.message || 'Error processing request' },
            { status: 500 }
        );
    }
}
