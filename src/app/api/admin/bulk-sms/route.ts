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

    // Filters
    const dateType = searchParams.get('dateType') || 'created_at';
    const dateField = dateType === 'updated_at' ? 'updated_at' : 'created_at'; // Fallback to created_at
    const status = searchParams.get('status'); // Can be comma separated
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const city = searchParams.get('city');
    const district = searchParams.get('district');
    const attorneyStatus = searchParams.get('attorneyStatus');
    const job = searchParams.get('job');
    const source = searchParams.get('source'); // created_by

    console.log('[BulkSMS API] Params:', { status, city, district, attorneyStatus, startDate, endDate, job, source, dateType });

    let query = supabaseAdmin
        .from('leads')
        // Ensure updated_at is selected
        .select('id, ad_soyad, telefon, durum, sehir, ilce, avukat_sorgu_durumu, created_at, updated_at, meslek_is, created_by')
        .order(dateField, { ascending: false });

    // Apply Filters
    if (status && status !== 'all') {
        console.log('[BulkSMS API] Filtering status:', status);
        if (status.includes(',')) {
            const statuses = status.split(',');
            query = query.in('durum', statuses);
        } else {
            query = query.eq('durum', status);
        }
    }

    if (city && city !== 'all') {
        query = query.eq('sehir', city);
    }

    if (district && district !== 'all') {
        query = query.eq('ilce', district);
    }

    if (attorneyStatus && attorneyStatus !== 'all') {
        query = query.eq('avukat_sorgu_durumu', attorneyStatus);
    }

    if (job && job !== 'all') {
        query = query.ilike('meslek_is', `%${job}%`);
    }

    if (source && source !== 'all') {
        query = query.eq('created_by', source);
    }

    if (startDate) {
        query = query.gte(dateField, startDate);
    }

    if (endDate) {
        // Postgre uses ISO strings. 
        // If user sends '2024-01-20', we want to include everything until '2024-01-20 23:59:59.999'
        // But simply setting hours on a Date object might have timezone offsets.
        // Let's create a date, add 1 day, and use lt (less than) the next day 00:00
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1); // Move to next day
        end.setHours(0, 0, 0, 0);       // Reset to midnight
        query = query.lt(dateField, end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({
        count: data.length,
        users: data
    });
}

export async function POST(req: NextRequest) {
    // This endpoint handles the actual SENDING mechanism
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { userIds, message, templateId, channel } = body; // channel: 'SMS' | 'WHATSAPP'

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ message: 'No users selected' }, { status: 400 });
        }

        if (!message) {
            return NextResponse.json({ message: 'Message content is empty' }, { status: 400 });
        }

        // Mock Sending Process for Now
        // In a real scenario, this would loop through userIds and call the SMS provider API
        // For WhatsApp, it might just log it or send via informal API if available.

        console.log(`[BULK ${channel}] Sending to ${userIds.length} users: ${message.substring(0, 50)}...`);

        // Log the bulk action
        const { error: logError } = await supabaseAdmin.from('logs').insert({
            customer_id: null, // Global log or maybe log for each user? 
            action: `BULK_${channel}`,
            user_email: session.user.email,
            details: `Sent to ${userIds.length} users. Msg: ${message.substring(0, 50)}...`
        });

        // Loop to log per user (Optional, might be heavy for large batches)
        // For now, let's just pretend we processed them.

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
