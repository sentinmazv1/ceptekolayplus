
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSheetData, getGoogleSheetClient } from '@/lib/google_migration';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const sheetId = process.env.GOOGLE_SHEET_ID;
        if (!sheetId) return NextResponse.json({ error: 'GOOGLE_SHEET_ID missing' }, { status: 500 });

        const performWrite = req.nextUrl.searchParams.get('write') === 'true';
        const targetTab = req.nextUrl.searchParams.get('tab') || 'Loglar'; // Try 'Loglar' default

        // 1. Fetch ALL Leads to Map (Phone -> UUID)
        // We need a robust map. Phone is best unique key.
        const { data: leads, error: leadsError } = await supabaseAdmin.from('leads').select('id, telefon, ad_soyad');
        if (leadsError) throw leadsError;

        const phoneMap = new Map<string, string>();
        const nameMap = new Map<string, string>(); // Fallback

        leads?.forEach(l => {
            if (l.telefon) phoneMap.set(normalizePhone(l.telefon), l.id);
            if (l.ad_soyad) nameMap.set(l.ad_soyad.toLowerCase().trim(), l.id);
        });

        // 2. Read Sheet
        // We'll try to read the header row first to identify columns
        let rows = await getSheetData(sheetId, `${targetTab}!A:Z`);

        if (!rows || rows.length === 0) {
            // Try 'Logs' if default failed
            rows = await getSheetData(sheetId, `Logs!A:Z`);
            if (!rows || rows.length === 0) {
                return NextResponse.json({ error: `Could not find data in tab '${targetTab}' or 'Logs'. Please specify tab name.` });
            }
        }

        const headers = rows[0].map((h: string) => h.toLowerCase().trim());
        const dataRows = rows.slice(1);

        // Identify Indices
        const idxDate = headers.findIndex((h: string) => h.includes('tarih') || h.includes('date') || h.includes('zaman'));
        const idxUser = headers.findIndex((h: string) => h.includes('kullanıcı') || h.includes('user') || h.includes('personel'));
        const idxCust = headers.findIndex((h: string) => h.includes('müşteri') || h.includes('customer') || h.includes('ad soyad'));
        const idxPhone = headers.findIndex((h: string) => h.includes('telefon') || h.includes('phone') || h.includes('iletişim'));
        const idxAction = headers.findIndex((h: string) => h.includes('işlem') || h.includes('action') || h.includes('durum'));
        const idxNote = headers.findIndex((h: string) => h.includes('not') || h.includes('açıklama'));

        const mapping = { idxDate, idxUser, idxCust, idxPhone, idxAction, idxNote };

        if (!performWrite) {
            return NextResponse.json({
                mode: 'dry_run',
                message: 'To execute, add ?write=true',
                found_tab: rows ? 'Found' : 'Not Found',
                headers,
                mapping_detected: mapping,
                sample_rows: dataRows.slice(0, 5),
                total_leads_in_db: leads?.length
            });
        }

        // 3. Process & Insert
        const logsToInsert: any[] = [];
        let skipped = 0;
        let matched = 0;

        for (const row of dataRows) {
            const dateStr = row[idxDate];
            const userStr = idxUser > -1 ? row[idxUser] : 'system';
            const phoneStr = idxPhone > -1 ? row[idxPhone] : '';
            const nameStr = idxCust > -1 ? row[idxCust] : '';
            const actionStr = idxAction > -1 ? row[idxAction] : 'LOG';
            const noteStr = idxNote > -1 ? row[idxNote] : '';

            // Resolve Customer ID
            let custId: string | undefined;

            // Try Phone
            if (phoneStr) {
                const p = normalizePhone(phoneStr);
                if (p && phoneMap.has(p)) custId = phoneMap.get(p);
            }

            // Try Name if no phone match
            if (!custId && nameStr) {
                const n = nameStr.toLowerCase().trim();
                if (nameMap.has(n)) custId = nameMap.get(n);
            }

            if (custId) {
                // Parse Date (Assuming DD.MM.YYYY HH:mm or similar)
                // Let's try flexible parsing or default to now
                let ts = new Date().toISOString();
                try {
                    // Try parsing Turkish format dd.mm.yyyy
                    if (dateStr && dateStr.includes('.')) {
                        const parts = dateStr.split(' ');
                        const dateParts = parts[0].split('.');
                        // yyyy-mm-dd
                        const d = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                        const t = parts[1] || '12:00';
                        ts = new Date(`${d}T${t}:00`).toISOString();
                    } else if (dateStr) {
                        const d = new Date(dateStr);
                        if (!isNaN(d.getTime())) ts = d.toISOString();
                    }
                } catch (e) { }

                logsToInsert.push({
                    created_at: ts,
                    user_email: userStr, // Hopefully email, if name map manually? Assume email or raw text
                    customer_id: custId,
                    action: actionStr.toUpperCase(), // Normalize action?
                    note: noteStr,
                    old_value: 'Legacy',
                    new_value: actionStr
                });
                matched++;
            } else {
                skipped++;
            }
        }

        // Batch Insert (Chunk 1000)
        if (logsToInsert.length > 0) {
            const { error: insertError } = await supabaseAdmin.from('activity_logs').insert(logsToInsert);
            if (insertError) throw insertError;
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
    return p.replace(/\D/g, '').replace(/^90/, '0').replace(/^0+/, ''); // Remove +90, clean
}
