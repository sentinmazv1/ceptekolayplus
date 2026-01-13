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
        const leadData: Partial<Customer> = {
            ...body,
            id: randomUUID(),
            durum: 'Yeni',
            sahip: session.user.email,
        };

        const newLead = await addLead(leadData, session.user.email);

        // Explicit Log (though addLead might not log creation automatically yet? Checked leads.ts, addLead does NOT log. So we log here.)
        await logAction({
            log_id: randomUUID(),
            timestamp: new Date().toISOString(),
            user_email: session.user.email,
            customer_id: newLead.id,
            action: 'CREATED',
            old_value: '',
            new_value: 'Yeni',
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
