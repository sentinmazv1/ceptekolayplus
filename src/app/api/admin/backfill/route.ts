import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google';
import { COLUMNS } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const client = getSheetsClient();
        const sheetId = process.env.GOOGLE_SHEET_ID;

        // 1. Sync Headers first
        await client.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: 'Customers!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [COLUMNS]
            }
        });

        // 2. Fetch Data to Backfill
        const response = await client.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Customers!A2:ZZ',
        });

        const rows = response.data.values || [];
        const channelIndex = COLUMNS.indexOf('basvuru_kanali');

        if (channelIndex === -1) {
            throw new Error('basvuru_kanali column not defined in schema');
        }

        const updates: { range: string; values: string[][] }[] = [];

        rows.forEach((row, index) => {
            const currentVal = row[channelIndex];

            // If empty or undefined, set to 'Sosyal Medya'
            if (!currentVal || currentVal.trim() === '') {
                const rowIndex = index + 2; // +1 header, +1 0-indexed
                const colLetter = getColLetter(channelIndex);

                updates.push({
                    range: `Customers!${colLetter}${rowIndex}`,
                    values: [['Sosyal Medya']]
                });
            }
        });

        if (updates.length > 0) {
            // Batch update is efficient
            await client.spreadsheets.values.batchUpdate({
                spreadsheetId: sheetId,
                requestBody: {
                    valueInputOption: 'USER_ENTERED',
                    data: updates
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: `Headers synced. Backfilled ${updates.length} rows.`
        });

    } catch (error: any) {
        console.error('Backfill Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// Helper
function getColLetter(index: number): string {
    let letter = '';
    while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
    }
    return letter;
}
