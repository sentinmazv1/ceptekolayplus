import { NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google';
import { COLUMNS } from '@/lib/sheets';
import { parse, isValid } from 'date-fns';

export const dynamic = 'force-dynamic';

function parseSheetDateDebug(dateStr: string | undefined): { parsed: number | null, reason: string } {
    if (!dateStr || !dateStr.trim()) return { parsed: null, reason: 'Empty/Null' };
    const cleanStr = dateStr.trim();

    // 1. Try standard JS Date
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) return { parsed: d.getTime(), reason: 'Standard Date' };

    // 2. Try date-fns formats
    const formats = [
        'dd.MM.yyyy HH:mm:ss',
        'dd.MM.yyyy HH:mm',
        'dd.MM.yyyy',
        'dd/MM/yyyy HH:mm:ss',
        'dd/MM/yyyy HH:mm',
        'dd/MM/yyyy',
        'dd-MM-yyyy HH:mm:ss',
        'dd-MM-yyyy HH:mm',
        'dd-MM-yyyy',
        'yyyy-MM-dd HH:mm:ss',
        'yyyy-MM-dd'
    ];

    const now = new Date();
    for (const fmt of formats) {
        const parsed = parse(cleanStr, fmt, now);
        if (isValid(parsed)) return { parsed: parsed.getTime(), reason: `Matched Format: ${fmt}` };
    }

    return { parsed: null, reason: 'Failed all formats' };
}

export async function GET() {
    try {
        const client = getSheetsClient();

        // Fetch ALL rows in relevant columns to find the latest data
        const response = await client.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Customers!A:O',
        });

        const rows = response.data.values || [];
        const sonAramaIndex = COLUMNS.indexOf('son_arama_zamani');

        // Server Time Info
        const serverDate = new Date();
        const trFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Istanbul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        const todayStr = trFormatter.format(serverDate).slice(0, 10); // YYYY-MM-DD

        // Get Last 50 rows (The most recent ones)
        const lastRows = rows.slice(-50);
        const startRowIndex = rows.length - lastRows.length + 1; // 1-indexed

        const debugLog = lastRows.map((row, i) => {
            const raw = row[sonAramaIndex];
            const result = parseSheetDateDebug(raw);

            let hour = null;
            let dateStr = null;
            let isToday = false;

            if (result.parsed) {
                const d = new Date(result.parsed);
                // Logic from sheets.ts
                dateStr = trFormatter.format(d).slice(0, 10);
                isToday = dateStr === todayStr;

                const hourStr = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'Europe/Istanbul',
                    hour: 'numeric',
                    hour12: false
                }).format(d);
                hour = parseInt(hourStr, 10);
            }

            return {
                row: startRowIndex + i,
                raw_value: raw,
                parsed_timestamp: result.parsed,
                logic_check: {
                    system_today: todayStr,
                    row_date: dateStr,
                    is_today: isToday,
                    extracted_hour: hour
                },
                reason: result.reason
            };
        }).filter(item => item.raw_value).reverse(); // Newest (bottom) first

        return NextResponse.json({
            server_time_raw: serverDate.toISOString(),
            server_today_tr: todayStr,
            total_rows_scanned: rows.length,
            debug_log: debugLog
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
