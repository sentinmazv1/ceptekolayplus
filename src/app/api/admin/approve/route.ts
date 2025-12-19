import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { updateLead, getLeads, logAction } from '@/lib/sheets';

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

        // Fetch the customer
        const leads = await getLeads();
        const customer = leads.find(l => l.id === customerId);

        if (!customer) {
            return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
        }

        // Update with approval
        const now = new Date().toISOString();
        const updated = await updateLead({
            ...customer,
            // Don't change durum - keep it as 'Başvuru alındı' or whatever it was
            onay_durumu: 'Onaylandı',
            kredi_limiti,
            admin_notu: admin_notu || '',
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
            old_value: customer.onay_durumu || 'Beklemede',
            new_value: 'Onaylandı',
            note: `Approved with limit: ${kredi_limiti}`
        });

        return NextResponse.json({ lead: updated });
    } catch (error: any) {
        console.error('Approve error:', error);
        return NextResponse.json(
            { message: error.message || 'Error approving application' },
            { status: 500 }
        );
    }
}
