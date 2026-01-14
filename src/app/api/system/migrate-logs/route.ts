
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSheetData, getGoogleSheetClient } from '@/lib/google_migration';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const sheetId = process.env.GOOGLE_SHEET_ID;
        if (!sheetId) return NextResponse.json({ error: 'GOOGLE_SHEET_ID missing' }, { status: 500 });

        const performWrite = req.nextUrl.searchParams.get('write') === 'true';
        const targetTab = req.nextUrl.searchParams.get('tab') || 'Loglar';

        // 1. Fetch ALL Leads to Map (UUID verification)
        const leadsMap = new Map<string, boolean>();

        let page = 0;
        const limit = 1000;
        let totalLeads = 0;

        while (true) {
            const { data: leads, error } = await supabaseAdmin
                .from('leads')
                .select('id')
                .range(page * limit, (page + 1) * limit - 1);

            if (error) throw error;
            if (!leads || leads.length === 0) break;

            leads.forEach(l => {
                leadsMap.set(l.id, true);
            });

            totalLeads += leads.length;
            if (leads.length < limit) break;
            page++;
        }

        // 2. Read Sheet
        let rows = await getSheetData(sheetId, `${targetTab}!A:Z`);

        if (!rows || rows.length === 0) {
            rows = await getSheetData(sheetId, `Logs!A:Z`);
            if (!rows || rows.length === 0) {
                return NextResponse.json({ error: `Could not find data in tab '${targetTab}' or 'Logs'.` });
            }
        }

        // HEURISTIC: Check if first row is headers or data
        // Check if Col 3 is a UUID (length check + hyphen)
        const firstRow = rows[0];
        const looksLikeData = (firstRow[0] && firstRow[0].length > 20 && firstRow[0].includes('-')) ||
            (firstRow[3] && firstRow[3].length > 20 && firstRow[3].includes('-'));

        // If it looks like data, we use all rows. Else assume header and slice 1.
        // Based on screenshot, row 0 IS data.
        const dataRows = looksLikeData ? rows : rows.slice(1);

        // Explicit Mapping based on User Screenshot
        // Col 1: Date (2026-01-02...)
        // Col 2: Email (gzd...)
        // Col 3: Customer UUID (4213...)
        // Col 4: Action (PULL_LEAD)
        // Col 5: Note 1 (Yeni)
        // Col 6: Note 2 (Aranacak)
        const idxDate = 1;
        const idxUser = 2;
        const idxCust = 3;
        const idxAction = 4;

        if (!performWrite) {
            return NextResponse.json({
                mode: 'dry_run',
                message: 'To execute, add ?write=true',
                found_tab: rows ? 'Found' : 'Not Found',
                total_leads_in_db: totalLeads,
                data_row_count: dataRows.length,
                first_row_is_data: looksLikeData,
                mapping_used: { idxDate, idxUser, idxCust, idxAction },
                sample_rows: dataRows.slice(0, 5)
            });
        }

        // 3. Process & Insert
        const logsToInsert: any[] = [];
        let skipped = 0;
        let matched = 0;

        for (const row of dataRows) {
            // Safety checks
            if (!row[idxCust]) { skipped++; continue; }

            const rawCustId = row[idxCust].trim();
            const dateStr = row[idxDate];
            const userStr = row[idxUser];
            const actionStr = row[idxAction];
            const noteParts = [row[5], row[6]].filter(Boolean).join(' - ');

            // Verify existence
            if (leadsMap.has(rawCustId)) {

                // Parse Date
                let ts = new Date().toISOString();
                try {
                    if (dateStr) {
                        const d = new Date(dateStr);
                        if (!isNaN(d.getTime())) {
                            ts = d.toISOString();
                        }
                    }
                } catch (e) { }

                logsToInsert.push({
                    created_at: ts,
                    user_email: userStr,
                    lead_id: rawCustId,
                    action: actionStr,
                    note: noteParts,
                    old_value: 'Legacy Import'
                });
                matched++;
            } else {
                skipped++;
            }
        }

        // Batch Insert (Chunk 1000) - Loop if needed but assume < 50k log or handle externally?
        // Supabase bulk insert limit is generous but let's chunk safely
        const CHUNK_SIZE = 1000;
        for (let i = 0; i < logsToInsert.length; i += CHUNK_SIZE) {
            const chunk = logsToInsert.slice(i, i + CHUNK_SIZE);
            const { error: insertError } = await supabaseAdmin.from('activity_logs').insert(chunk);
            if (insertError) {
                console.error("Chunk insert error", insertError);
                return NextResponse.json({
                    success: false,
                    stage: 'insertion',
                    error: insertError,
                    message: 'Database insert failed. Check RLS policies or Service Key.'
                }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            processed: dataRows.length,
            inserted: matched,
            skipped_no_match: skipped,
            example_log: logsToInsert[0]
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function normalizePhone(p: string) {
    if (!p) return '';
    return p.replace(/\D/g, '').replace(/^90/, '0').replace(/^0+/, '');
}
