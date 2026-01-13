import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLeadStats } from '@/lib/leads';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const stats = await getLeadStats(session.user as any);
        return NextResponse.json(stats);
    } catch (error: any) {
        console.error('Stats fetch error:', error);
        return NextResponse.json({ message: error.message || 'Error fetching stats' }, { status: 500 });
    }
}
