import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCustomersByStatus } from '@/lib/leads';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !session?.user?.role) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    if (!status) {
        return NextResponse.json({ error: 'Status parameter required' }, { status: 400 });
    }

    try {
        const customers = await getCustomersByStatus(
            status,
            { email: session.user.email, role: session.user.role }
        );

        return NextResponse.json({
            success: true,
            customers,
            count: customers.length
        });
    } catch (error: any) {
        console.error('Error fetching customers by status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch customers', message: error.message },
            { status: 500 }
        );
    }
}
