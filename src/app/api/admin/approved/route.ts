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
        // Date Filtering
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let leads = await getLeads({ durum: 'Onaylandı' });

        if (startDate || endDate) {
            const start = startDate ? new Date(startDate).getTime() : 0;
            const end = endDate ? new Date(endDate).getTime() + 86400000 : Infinity; // Add 1 day to include the end date

            leads = leads.filter(lead => {
                // Use 'onay_tarihi' if reliable, otherwise 'created_at'
                // Note: 'onay_tarihi' is a string like "2023-10-25" or ISO. Need to be careful.
                const dateStr = lead.onay_tarihi || lead.created_at;
                const d = new Date(dateStr).getTime();
                return d >= start && d < end;
            });
        }

        // Sort by 'onay_tarihi' or 'updated_at' or 'created_at' (Newest First)
        leads.sort((a, b) => {
            const dateA = new Date(a.onay_tarihi || a.updated_at || a.created_at).getTime();
            const dateB = new Date(b.onay_tarihi || b.updated_at || b.created_at).getTime();
            return dateB - dateA; // Descending
        });

        const approvedLeads = leads;

        console.log(`Found ${approvedLeads.length} approved leads`);

        return NextResponse.json({ leads: approvedLeads });
    } catch (error: any) {
        console.error('Approved leads fetch error:', error);
        return NextResponse.json(
            { message: error.message || 'Error fetching approved leads' },
            { status: 500 }
        );
    }
}
