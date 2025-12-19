import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google';
import { COLUMNS } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const tc = searchParams.get('tc');

        if (!tc) {
            return NextResponse.json({ success: false, message: 'TC Kimlik No gereklidir.' }, { status: 400 });
        }

        const client = getSheetsClient();
        const sheetId = process.env.GOOGLE_SHEET_ID;

        // Fetch all data
        const response = await client.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Customers!A2:ZZ',
        });

        const rows = response.data.values || [];

        // Find matching customer
        const tcIndex = COLUMNS.indexOf('tc_kimlik');

        if (tcIndex === -1) {
            return NextResponse.json({ success: false, message: 'Veri şeması hatası: TC Sütunu bulunamadı.' }, { status: 500 });
        }

        const foundRow = rows.find(row => row[tcIndex] === tc);

        if (!foundRow) {
            return NextResponse.json({ success: true, found: false, message: 'Müşteri bulunamadı.' });
        }

        // Map row to object
        const customer: any = {};
        COLUMNS.forEach((col, idx) => {
            customer[col] = foundRow[idx] || null;
        });

        return NextResponse.json({ success: true, found: true, customer });

    } catch (error: any) {
        console.error('Search API Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
