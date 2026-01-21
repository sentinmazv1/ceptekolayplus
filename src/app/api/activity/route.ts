
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRecentLogs } from '@/lib/leads';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const url = new URL(req.url);
        const minutes = url.searchParams.get('minutes') ? parseInt(url.searchParams.get('minutes')!) : undefined;
        const logs = await getRecentLogs(50, minutes);
        return NextResponse.json({
            success: true,
            logs
        });
    } catch (error) {
        console.error('Failed to fetch activity logs:', error);
        return NextResponse.json({ message: 'Failed to fetch logs' }, { status: 500 });
    }
}
