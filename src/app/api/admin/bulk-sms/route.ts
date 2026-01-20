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

    console.log('[BulkSMS API] Received params:', { status, city, district, attorneyStatus, startDate, endDate, job, source, dateType });

    let query = supabaseAdmin
        .from('leads')
        .select('id, ad_soyad, telefon, durum, sehir, ilce, avukat_sorgu_durumu, created_at, updated_at, meslek_is, created_by')
        .order(dateField, { ascending: false });

    console.log('[BulkSMS API] Initial query created, applying filters...');

    // Apply Filters with robust handling
    if (status && status !== 'all' && status.trim() !== '') {
        console.log('[BulkSMS API] Applying status filter:', status);
        if (status.includes(',')) {
            const statuses = status.split(',').map(s => s.trim());
            // Use case-insensitive matching for Turkish characters
            query = query.ilike('durum', statuses.join('|'));
        } else {
            // Use ilike for case-insensitive + handle Turkish characters
            query = query.ilike('durum', status.trim());
        }
    } else {
        console.log('[BulkSMS API] No status filter applied');
    }

    if (city && city !== 'all') {
        console.log('[BulkSMS API] Applying city filter:', city);
        query = query.eq('sehir', city);
    }

    if (district && district !== 'all') {
        console.log('[BulkSMS API] Applying district filter:', district);
        query = query.eq('ilce', district);
    }

    if (attorneyStatus && attorneyStatus !== 'all') {
        console.log('[BulkSMS API] Applying attorney status filter:', attorneyStatus);
        query = query.eq('avukat_sorgu_durumu', attorneyStatus);
    }

    if (job && job.trim() !== '') {
        console.log('[BulkSMS API] Applying job filter:', job);
        query = query.ilike('meslek_is', `%${job.trim()}%`);
    }

    if (source && source !== 'all') {
        console.log('[BulkSMS API] Applying source filter:', source);
        query = query.eq('created_by', source);
    }

    // Date filtering with explicit checks
    const hasStartDate = startDate && startDate.trim() !== '';
    const hasEndDate = endDate && endDate.trim() !== '';

    console.log('[BulkSMS API] Date filters:', { hasStartDate, hasEndDate, dateType });

    if (hasStartDate || hasEndDate) {
        if (dateType === 'log_date') {
            console.log('[BulkSMS API] Using log-based date filtering');
            // LOG BASED FILTERING
            let logQuery = supabaseAdmin
                .from('logs')
                .select('customer_id');

            if (hasStartDate) {
                logQuery = logQuery.gte('created_at', startDate);
            }

            if (hasEndDate) {
                const end = new Date(endDate);
                end.setDate(end.getDate() + 1);
                end.setHours(0, 0, 0, 0);
                logQuery = logQuery.lt('created_at', end.toISOString());
            }

            const { data: logData, error: logError } = await logQuery;

            if (logError) {
                console.error('[BulkSMS API] Log query error:', logError);
            } else if (logData && logData.length > 0) {
                const customerIds = [...new Set(logData.map((l: any) => l.customer_id))]; // Remove duplicates
                console.log(`[BulkSMS API] Found ${customerIds.length} unique customers in logs`);
                query = query.in('id', customerIds);
            } else {
                console.log('[BulkSMS API] No logs found in date range, returning empty');
                return NextResponse.json({ count: 0, users: [] });
            }
        } else {
            // STANDARD FIELD FILTERS (created_at / updated_at)
            console.log(`[BulkSMS API] Using standard field filter on ${dateField}`);

            if (hasStartDate) {
                query = query.gte(dateField, startDate);
            }

            if (hasEndDate) {
                const end = new Date(endDate);
                end.setDate(end.getDate() + 1);
                end.setHours(0, 0, 0, 0);
                query = query.lt(dateField, end.toISOString());
            }
        }
    } else {
        console.log('[BulkSMS API] No date filters applied - returning all matches');
    }


    console.log('[BulkSMS API] Executing query...');
    const { data, error } = await query;

    if (error) {
        console.error('[BulkSMS API] Query error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }

    console.log(`[BulkSMS API] Query successful! Found ${data?.length || 0} users`);
    if (data && data.length > 0) {
        console.log('[BulkSMS API] Sample result (first 3):', data.slice(0, 3).map(u => ({ name: u.ad_soyad, status: u.durum })));
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
