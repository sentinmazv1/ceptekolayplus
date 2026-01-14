import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateLead, getLead, logAction } from '@/lib/leads';
import { sendStatusEmail } from '@/lib/email-service';

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
        const { customerId, kredi_limiti, admin_notu } = body;

        if (!customerId || !kredi_limiti) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        // Fetch the customer directly
        const customer = await getLead(customerId);

        if (!customer) {
            return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
        }

        // Update with approval
        const now = new Date().toISOString();
        const updated = await updateLead({
            ...customer,
            // Update status to 'Onaylandı' so it leaves the pool
            durum: 'Onaylandı',
            onay_durumu: 'Onaylandı',
            kredi_limiti,
            admin_notu: admin_notu || '',
            onay_tarihi: now,
            onaylayan_admin: session.user.email
        }, session.user.email);

        // Send Email Notification
        // await sendStatusEmail(updated, 'Onaylandı');

        // Log action
        await logAction({
            log_id: crypto.randomUUID(),
            timestamp: now,
            user_email: session.user.email,
            customer_id: customerId,
            action: 'UPDATE_STATUS',
            old_value: customer.onay_durumu || 'Beklemede',
            new_value: 'Onaylandı',
            note: `Approved with limit: ${kredi_limiti}`
        });

        // --- SMS TRIGGER ---
        const { SMS_TEMPLATES } = await import('@/lib/sms-templates');
        const { sendSMS } = await import('@/lib/sms');
        const msg = SMS_TEMPLATES.APPROVED(customer.ad_soyad, kredi_limiti);

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
                    note: 'Yönetici Onayı',
                    new_value: msg
                });
            }
            */
            console.log('Skipping Auto-SMS (Manual Mode Active):', msg);
        }

        return NextResponse.json({ lead: updated });
    } catch (error: any) {
        console.error('Approve error:', error);
        return NextResponse.json(
            { message: error.message || 'Error approving application' },
            { status: 500 }
        );
    }
}
