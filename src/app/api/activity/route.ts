
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRecentLogs } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const logs = await getRecentLogs(50);
        return NextResponse.json({
            success: true,
            logs
        });
    } catch (error) {
        console.error('Failed to fetch activity logs:', error);
        return NextResponse.json({ message: 'Failed to fetch logs' }, { status: 500 });
    }
}
