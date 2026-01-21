import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAction } from '@/lib/leads';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { customer_id, action, note } = body;

        if (!customer_id || !action) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        await logAction({
            log_id: uuidv4(),
            timestamp: new Date().toISOString(),
            user_email: session.user.email,
            customer_id: customer_id,
            action: action,
            note: note || ''
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Log Action API Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
