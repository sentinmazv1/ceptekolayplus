import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    // Simple filters: only status and dates
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    console.log('[BulkSMS API] Simple filters:', { status, startDate, endDate });

    let query = supabaseAdmin
        .from('leads')
        .select('id, ad_soyad, telefon, durum, sehir, ilce, created_at')
        .order('created_at', { ascending: false });

    // Apply status filter
    if (status && status !== 'all') {
        console.log('[BulkSMS API] Filtering by status:', status);
        query = query.eq('durum', status);
    }

    // Apply date filters
    if (startDate) {
        console.log('[BulkSMS API] Start date:', startDate);
        query = query.gte('created_at', startDate);
    }

    if (endDate) {
        // Include the entire end date
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        end.setHours(0, 0, 0, 0);
        console.log('[BulkSMS API] End date (inclusive):', end.toISOString());
        query = query.lt('created_at', end.toISOString());
    }

    console.log('[BulkSMS API] Executing query...');
    const { data, error } = await query;

    if (error) {
        console.error('[BulkSMS API] Query error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }

    console.log(`[BulkSMS API] Success! Found ${data?.length || 0} users`);

    return NextResponse.json({
        count: data.length,
        users: data
    });
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { userIds, message, templateId, channel } = body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ message: 'No users selected' }, { status: 400 });
        }

        if (!message) {
            return NextResponse.json({ message: 'Message content is empty' }, { status: 400 });
        }

        console.log(`[BULK ${channel}] Sending to ${userIds.length} users`);

        // Log the bulk action
        await supabaseAdmin.from('logs').insert({
            customer_id: null,
            action: `BULK_${channel}`,
            user_email: session.user.email,
            details: `Sent to ${userIds.length} users. Msg: ${message.substring(0, 50)}...`
        });

        return NextResponse.json({
            success: true,
            processed: userIds.length,
            message: `${userIds.length} kişiye ${channel} gönderim kuyruğuna alındı.`
        });

    } catch (error: any) {
        console.error('Bulk Send Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
