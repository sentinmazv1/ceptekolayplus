import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { lockNextLead } from '@/lib/leads';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Anti-Fraud: Check if user pulled > 5 leads without any other action recently
        const { data: recentLogs, error: logsError } = await supabaseAdmin
            .from('activity_logs')
            .select('action')
            .eq('user_email', session.user.email)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!logsError && recentLogs) {
            let pullCount = 0;
            let otherAction = false;
            for (const log of recentLogs) {
                if (log.action === 'PULL_LEAD') {
                    pullCount++;
                } else if (!['CLICK_CALL', 'CLICK_WHATSAPP', 'CLICK_SMS'].includes(log.action)) {
                    // If they did something else (UPDATE_STATUS, etc.), they are working
                    otherAction = true;
                    break;
                }
                if (pullCount >= 5) break;
            }

            if (pullCount >= 5 && !otherAction) {
                return NextResponse.json({
                    message: 'Çok fazla boş müşteri çektiniz. Lütfen elinizdeki müşterilerle ilgili işlem yapmadan yeni müşteri çekmeyin.'
                }, { status: 429 });
            }
        }

        const lead = await lockNextLead(session.user.email);

        if (!lead) {
            return NextResponse.json({ message: 'Havuzda yeni müşteri kalmadı.' }, { status: 404 });
        }

        return NextResponse.json({ lead });
    } catch (error) {
        console.error('Pull lead error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
