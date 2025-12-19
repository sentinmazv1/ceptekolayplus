import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google';
import { COLUMNS } from '@/lib/sheets';
import { Customer } from '@/lib/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body: Partial<Customer> = await req.json();

        // Validation
        if (!body.ad_soyad || !body.telefon || !body.tc_kimlik) {
            return NextResponse.json({ success: false, message: 'Ad Soyad, Telefon ve TC Kimlik zorunludur.' }, { status: 400 });
        }

        const client = getSheetsClient();
        const sheetId = process.env.GOOGLE_SHEET_ID;

        // Generate ID and Defaults
        const newId = randomUUID();
        const now = new Date().toISOString();
        const owner = session.user.email;

        // Prepare Row Data mapping to COLUMNS order
        const rowData = COLUMNS.map(col => {
            if (col === 'id') return newId;
            if (col === 'created_at') return now;
            if (col === 'updated_at') return now;
            if (col === 'sahip') return owner;
            if (col === 'durum') return 'Yeni'; // Default status
            if (col === 'cekilme_zamani') return now; // Considered 'pulled' by the creator

            // Map incoming body fields
            if (body[col as keyof Customer] !== undefined) {
                return body[col as keyof Customer];
            }
            return '';
        });

        // 1. Append to Customers Sheet
        await client.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: 'Customers!A:A',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [rowData]
            }
        });

        // 2. Log Creation
        const logId = randomUUID();
        const logRow = [
            logId,
            now,
            owner,
            newId,
            'CREATED',
            '',
            'Yeni',
            `Müşteri manuel oluşturuldu. Kanal: ${body.basvuru_kanali || 'Belirtilmedi'}`
        ];

        await client.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: 'Logs!A:A',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [logRow]
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Müşteri başarıyla oluşturuldu.',
            lead: {
                ...body,
                id: newId,
                durum: 'Yeni',
                sahip: owner
            }
        });

    } catch (error: any) {
        console.error('Create Lead API Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
