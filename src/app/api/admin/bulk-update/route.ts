
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logAction } from '@/lib/leads';

// Force dynamic to ensure fresh data
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { currentStatus, newStatus, userEmail } = body;

        if (!currentStatus || !newStatus || !userEmail) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        if (currentStatus === newStatus) {
            return NextResponse.json({ success: false, error: 'Source and Target status cannot be the same' }, { status: 400 });
        }

        // 1. Fetch IDs to be updated (for logging)
        const { data: leadsToUpdate, error: fetchError } = await supabaseAdmin
            .from('leads')
            .select('id, durum')
            .eq('durum', currentStatus);

        if (fetchError) throw fetchError;
        if (!leadsToUpdate || leadsToUpdate.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: 'No records found with this status.' });
        }

        // 2. Perform Bulk Update
        const { error: updateError } = await supabaseAdmin
            .from('leads')
            .update({ durum: newStatus, updated_at: new Date().toISOString() })
            .eq('durum', currentStatus);

        if (updateError) throw updateError;

        // 3. Log Actions (Async/Fire & Forget for speed)
        // Note: For very large datasets (e.g. 5000+), this loop might be slow. 
        // Ideally we'd do a bulk insert into logs, but logAction is singular.
        // We will batch insert manually here for performance.
        const logEntries = leadsToUpdate.map((lead: any) => ({
            user_email: userEmail,
            lead_id: lead.id,
            action: 'UPDATE_STATUS',
            old_value: currentStatus,
            new_value: newStatus,
            note: 'Bulk Update (Settings)'
        }));

        const { error: logError } = await supabaseAdmin
            .from('activity_logs')
            .insert(logEntries);

        if (logError) console.error('Bulk Log Error:', logError);

        return NextResponse.json({
            success: true,
            count: leadsToUpdate.length,
            message: `Successfully moved ${leadsToUpdate.length} customers from "${currentStatus}" to "${newStatus}".`
        });

    } catch (e: any) {
        console.error('Bulk Update Error:', e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
