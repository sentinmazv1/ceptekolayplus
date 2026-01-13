
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLogs } from '@/lib/leads';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
        return NextResponse.json({ message: 'Customer ID required' }, { status: 400 });
    }

    try {
        const logs = await getLogs(customerId);
        return NextResponse.json({ logs });
    } catch (error) {
        console.error('Failed to fetch logs:', error);
        return NextResponse.json({ message: 'Failed to fetch logs' }, { status: 500 });
    }
}
