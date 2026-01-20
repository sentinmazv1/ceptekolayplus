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

        // Import SMS sending function
        const { sendSMS } = await import('@/lib/sms');

        // Fetch user phone numbers
        const { data: users, error: usersError } = await supabaseAdmin
            .from('leads')
            .select('id, ad_soyad, telefon')
            .in('id', userIds);

        if (usersError || !users) {
            return NextResponse.json({ message: 'Failed to fetch users' }, { status: 500 });
        }

        // Send SMS to each user
        let successCount = 0;
        let failCount = 0;
        const results = [];

        for (const user of users) {
            if (!user.telefon) {
                failCount++;
                results.push({ user: user.ad_soyad, status: 'failed', reason: 'No phone number' });
                continue;
            }

            // Send SMS (only if channel is SMS)
            if (channel === 'SMS') {
                const result = await sendSMS(user.telefon, message);

                if (result.success) {
                    successCount++;
                    results.push({ user: user.ad_soyad, phone: user.telefon, status: 'sent' });

                    // Log successful send
                    await supabaseAdmin.from('logs').insert({
                        customer_id: user.id,
                        action: 'SEND_SMS',
                        user_email: session.user.email,
                        details: `Bulk SMS: ${message.substring(0, 50)}...`,
                        new_value: result.result || 'sent'
                    });
                } else {
                    failCount++;
                    results.push({ user: user.ad_soyad, phone: user.telefon, status: 'failed', reason: result.result });
                }
            } else {
                // WhatsApp - for now just log
                failCount++;
                results.push({ user: user.ad_soyad, status: 'failed', reason: 'WhatsApp not yet implemented' });
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Log bulk action summary
        await supabaseAdmin.from('logs').insert({
            customer_id: null,
            action: `BULK_${channel}_SUMMARY`,
            user_email: session.user.email,
            details: `Sent to ${userIds.length} users. Success: ${successCount}, Failed: ${failCount}`
        });

        return NextResponse.json({
            success: true,
            processed: userIds.length,
            successCount,
            failCount,
            results,
            message: `${channel} gönderimi tamamlandı. Başarılı: ${successCount}, Başarısız: ${failCount}`
        });

    } catch (error: any) {
        console.error('Bulk Send Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
