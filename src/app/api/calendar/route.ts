import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLeads } from '@/lib/leads';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const query = { durum: 'Daha sonra aranmak istiyor' as const };

        // Admins see all, Sales Reps see own? 
        // Usually Calendar should show own appointments.
        // Let's filter by ownership if Sales Rep.
        const filter = session.user.role === 'SALES_REP'
            ? { ...query, sahip: session.user.email || undefined }
            : query;

        const leads = await getLeads(filter);

        const events = leads
            .filter(l => l.sonraki_arama_zamani) // Must have date
            .map(l => ({
                id: l.id,
                title: l.ad_soyad,
                start: l.sonraki_arama_zamani,
                customer: l // Embed full customer for easy editing
            }));

        return NextResponse.json({ events });
    } catch (error) {
        console.error('Calendar API Error:', error);
        return NextResponse.json({ events: [] }, { status: 500 });
    }
}
