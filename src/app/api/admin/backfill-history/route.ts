
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        let logCount = 0;
        let historyCount = 0;

        // 1. Fetch Legacy Logs related to Attorney Query
        // Looking for "Avukat", "Sorgu" in note or new_value
        // This is a heave query, might need LIMIT if too many logs.
        const { data: logs, error } = await supabaseAdmin
            .from('activity_logs')
            .select('*')
            .or('note.ilike.%avukat%,new_value.ilike.%avukat%,note.ilike.%sorgu%,new_value.ilike.%sorgu%')
            .order('created_at', { ascending: true });

        if (error) throw error;
        if (!logs) return NextResponse.json({ message: "No logs found" });

        logCount = logs.length;

        const historyInserts: any[] = [];

        for (const log of logs) {
            // Determine if it matches our schema
            // We need to guess 'new_status'. 
            // Often new_value is just 'Temiz', 'Riskli', or the full sentence.
            // Or log.action can be 'UPDATE_FIELDS'.

            let status = log.new_value;
            let result = null;

            // Clean up status if it's JSON or weird string
            if (status && status.startsWith('{')) continue; // Skip complex jsons for now
            if (!status || status.length > 50) status = "Değişiklik (Detay Logda)";

            // Try to infer result context
            if (log.note && log.note.includes('Sonuç')) {
                result = log.new_value; // Maybe the value is the result?
            }

            // Prepare record
            historyInserts.push({
                lead_id: log.lead_id,
                new_status: status,
                changed_by: log.user_email,
                created_at: log.created_at,
                metadata: {
                    source: 'legacy_log_backfill',
                    original_note: log.note
                }
            });
        }

        // Batch Insert
        if (historyInserts.length > 0) {
            const { error: insertError } = await supabaseAdmin
                .from('attorney_status_history')
                .insert(historyInserts);

            if (insertError) throw insertError;
            historyCount = historyInserts.length;
        }

        // 2. Also Backfill Delivery Dates?
        // Query Logs for 'Teslim edildi' where lead's teslim_tarihi is NULL?
        // (Optional, based on user request "bu ay için bi çözüm")

        return NextResponse.json({
            success: true,
            scanned: logCount,
            migrated: historyCount,
            message: "Attorney history backfilled successfully."
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
