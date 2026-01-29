import { NextRequest, NextResponse } from 'next/server';
import { Customer } from '@/lib/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addLead, logAction } from '@/lib/leads';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body: Partial<Customer> = await req.json();

        // Validation
        // TC is optional for preliminary requests (TALEP_BEKLEYEN) or manual quick entry
        const isRequest = body.durum === 'TALEP_BEKLEYEN';

        if (!body.ad_soyad || !body.telefon) {
            return NextResponse.json({ success: false, message: 'Ad Soyad ve Telefon zorunludur.' }, { status: 400 });
        }

        if (!isRequest && !body.tc_kimlik) {
            // For full applications, TC might be required, but let's relax it generally for Admin manual entry if needed.
            // But strict for Web Application form.
            // Currently, let's just make it required unless it's a Request.
            // Actually, seeing as this API is general, let's keep it required strictly ONLY if it's NOT a request.
            return NextResponse.json({ success: false, message: 'TC Kimlik zorunludur.' }, { status: 400 });
        }

        // Add Defaults
        const leadData: Partial<Customer> = {
            ...body,
            id: randomUUID(),
            durum: body.durum || 'Yeni', // Fix: Respect provided status (e.g. Başvuru alındı)
            sahip: session.user.email,
        };

        const newLead = await addLead(leadData, session.user.email);

        // Explicit Log
        await logAction({
            log_id: randomUUID(),
            timestamp: new Date().toISOString(),
            user_email: session.user.email,
            customer_id: newLead.id,
            action: 'CREATED',
            old_value: '',
            new_value: leadData.durum || 'Yeni', // Log actual status
            note: `Müşteri manuel oluşturuldu. Kanal: ${body.basvuru_kanali || 'Panel'}`
        });

        return NextResponse.json({
            success: true,
            message: 'Müşteri başarıyla oluşturuldu.',
            lead: newLead
        });

    } catch (error: any) {
        console.error('Create Lead API Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
