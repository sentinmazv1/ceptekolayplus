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
        // Fetch only leads with "Onaylandı" status
        const approvedLeads = await getLeads({ durum: 'Onaylandı' });

        // Sort by update date (newest first) if possible, or created_at
        // Assuming we want to see recently approved ones first
        approvedLeads.sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA; // Descending
        });

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
