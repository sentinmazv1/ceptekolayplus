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
        if (!body.ad_soyad || !body.telefon || !body.tc_kimlik) {
            return NextResponse.json({ success: false, message: 'Ad Soyad, Telefon ve TC Kimlik zorunludur.' }, { status: 400 });
        }

        // Add Defaults
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
