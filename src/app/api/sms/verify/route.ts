import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAction } from '@/lib/leads';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';
import { randomInt } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action, customerId, phone, code } = body;

        // 1. SEND CODE
        if (action === 'SEND') {
            if (!customerId || !phone) return NextResponse.json({ success: false, message: 'Missing params' }, { status: 400 });

            // Generate Code
            const verifyCode = randomInt(100000, 999999).toString();

            // Log it (This is our storage)
            await logAction({
                log_id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                user_email: session.user.email,
                customer_id: customerId,
                action: 'SMS_VERIFICATION_CODE', // Special action
                note: `Verification Code: ${verifyCode}`,
                old_value: '',
                new_value: verifyCode
            });

            // Send SMS
            const message = `Doğrulama Kodunuz: ${verifyCode}. Güvenliğiniz için kodu kimseyle paylaşmayınız.`;

            const { success, result } = await sendSMS(phone, message);

            if (!success) {
                return NextResponse.json({ success: false, message: `SMS Gönderilemedi: ${result}` }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: 'Kod gönderildi.', code: verifyCode });
        }

        // 2. VERIFY CODE
        if (action === 'VERIFY') {
            if (!customerId || !code) return NextResponse.json({ success: false, message: 'Missing params' }, { status: 400 });

            // Fetch last log for this customer
            const { data: logs, error } = await supabaseAdmin
                .from('activity_logs')
                .select('*')
                .eq('lead_id', customerId)
                .eq('action', 'SMS_VERIFICATION_CODE')
                .order('created_at', { ascending: false })
                .limit(1);

            if (error || !logs || logs.length === 0) {
                return NextResponse.json({ success: false, message: 'Kod bulunamadı.' }, { status: 400 });
            }

            const lastLog = logs[0];

            // Check expiry (e.g. 5 mins)
            const diff = new Date().getTime() - new Date(lastLog.created_at).getTime();
            if (diff > 5 * 60 * 1000) {
                return NextResponse.json({ success: false, message: 'Kod süresi dolmuş.' }, { status: 400 });
            }

            // Check Match
            if (lastLog.new_value !== code) {
                return NextResponse.json({ success: false, message: 'Hatalı kod.' }, { status: 400 });
            }

            // Mark as Verified
            // Table is 'leads'
            const { error: updateError } = await supabaseAdmin
                .from('leads')
                .update({ telefon_onayli: true })
                .eq('id', customerId);

            if (updateError) {
                console.error('Update Error:', updateError);
                return NextResponse.json({ success: false, message: 'Güncelleme hatası' }, { status: 500 });
            }

            // Log Success
            await logAction({
                log_id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                user_email: session.user.email,
                customer_id: customerId,
                action: 'UPDATE_STATUS', // Or generic
                note: 'Telefon Numarası Doğrulandı (SMS)',
                old_value: 'Onaysız',
                new_value: 'Onaylı'
            });

            return NextResponse.json({ success: true, message: 'Doğrulama başarılı.' });
        }

        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Verify API Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
