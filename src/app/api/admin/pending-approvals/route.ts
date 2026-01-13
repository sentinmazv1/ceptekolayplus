import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLeads } from '@/lib/sheets';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Forbidden - Admin only' }, { status: 403 });
    }

    try {
        // Fetch only leads with "Başvuru alındı" status
        // User requested strict "Başvuru alındı" for the Admin List ("Havuz")
        const pendingLeads = await getLeads({ durum: 'Başvuru alındı' });

        // We no longer filter by onay_durumu here to ensure re-submitted apps appear.


        // Sort by creation date (oldest first for FIFO)
        pendingLeads.sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateA - dateB;
        });

        console.log(`Found ${pendingLeads.length} pending approvals`);
        if (pendingLeads.length > 0) {
            console.log('First lead sample:', { id: pendingLeads[0].id, ad_soyad: pendingLeads[0].ad_soyad });
        }

        return NextResponse.json({ leads: pendingLeads });
    } catch (error: any) {
        console.error('Pending approvals fetch error:', error);
        return NextResponse.json(
            { message: error.message || 'Error fetching pending approvals' },
            { status: 500 }
        );
    }
}
