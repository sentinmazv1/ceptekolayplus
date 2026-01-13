
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendSMS } from '@/lib/sms';
import { logAction } from '@/lib/leads';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { customerId, phone, message } = body;

        if (!phone || !message) {
            return NextResponse.json({ message: 'Phone and message are required' }, { status: 400 });
        }

        const { success, result } = await sendSMS(phone, message);

        if (success) {
            // ... (Logging logic remains) ...
            if (customerId) {
                await logAction({
                    log_id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    user_email: session.user.email,
                    customer_id: customerId,
                    action: 'SEND_SMS',
                    note: 'Manuel Gönderim',
                    new_value: message
                });
            }
            return NextResponse.json({ success: true, result });
        } else {
            // Explicitly return the failure code from NetGSM
            return NextResponse.json({ success: false, message: `HATA: ${result}` }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Manual SMS Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
