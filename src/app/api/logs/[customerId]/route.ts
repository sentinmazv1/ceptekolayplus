import { NextRequest, NextResponse } from 'next/server';
import { getLogs, logAction } from '@/lib/leads';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ customerId: string }> }) {
    try {
        const { customerId } = await params;
        if (!customerId) {
            return NextResponse.json({ success: false, message: 'Customer ID required' }, { status: 400 });
        }


        const logs = await getLogs(customerId);
        return NextResponse.json({ success: true, logs });



    } catch (error: any) {
        console.error('Logs API Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ customerId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { customerId } = await params;
        const body = await req.json();
        const { action, note } = body;

        await logAction({
            log_id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            user_email: session.user.email || 'System',
            customer_id: customerId,
            action: action || 'CUSTOM_ACTION',
            note: note || ''
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Log creation error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
