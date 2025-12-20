import { NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google';
import { getLeadStats } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getSheetsClient();
        const sheetId = process.env.GOOGLE_SHEET_ID;

        const response = await client.spreadsheets.values.get({
            spreadsheetId: sheetId!,
            range: 'Customers!A1:ZZ1000',
        });

        const values = response.data.values || [];
        const headers = values[0];
        const rows = values.slice(1);

        // Analyze 'durum' column (Index 10 based on standard COLUMNS)
        // We'll also try to find 'durum' by header name if possible
        const durumIndex = 10;
        const onayIndex = 43; // AR

        const durumCounts: Record<string, number> = {};
        const onayCounts: Record<string, number> = {};

        rows.forEach(row => {
            const d = row[durumIndex] ? row[durumIndex].trim() : 'EMPTY';
            const o = row[onayIndex] ? row[onayIndex].trim() : 'EMPTY';

            durumCounts[d] = (durumCounts[d] || 0) + 1;
            onayCounts[o] = (onayCounts[o] || 0) + 1;
        });

        // Run the actual stats function
        const libStats = await getLeadStats();

        return NextResponse.json({
            durumCounts,
            onayCounts,
            libStats,
            headers: headers.slice(0, 50) // Show first 50 headers
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack });
    }
}
