
import { NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/google';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const client = getSheetsClient();
        const sheetId = process.env.GOOGLE_SHEET_ID;

        // Fetch Users from Sheets matches logic in old auth.ts
        // Range: Users!A2:D. Cols: Email (A), Name (B), Role (C), Password (D)
        const response = await client.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Users!A2:D',
        });

        const rows = response.data.values || [];

        if (rows.length === 0) {
            return NextResponse.json({ message: 'No users found in Sheet' });
        }

        const stats = {
            processed: 0,
            inserted: 0,
            errors: 0,
            details: [] as string[]
        };

        for (const row of rows) {
            stats.processed++;
            const email = row[0]?.trim().toLowerCase();
            const name = row[1]?.trim();
            const role = row[2]?.trim().toUpperCase(); // ADMIN or SALES_REP
            const password = row[3]?.trim();

            if (!email || !password) {
                stats.errors++;
                stats.details.push(`Skipped row ${stats.processed}: Missing email or password`);
                continue;
            }

            // Insert into Supabase
            // We use Upsert to be safe
            const { error } = await supabaseAdmin
                .from('users')
                .upsert({
                    email,
                    name,
                    role: ['ADMIN', 'YÖNETİCİ', 'YONETICI', 'YÖNETICI'].includes(role || '') ? 'ADMIN' : 'SALES_REP',
                    password: password, // Plain text migration
                    updated_at: new Date().toISOString()
                }, { onConflict: 'email' });

            if (error) {
                stats.errors++;
                console.error('User migration error:', error);
                stats.details.push(`Error inserting ${email}: ${error.message}`);
            } else {
                stats.inserted++;
            }
        }

        return NextResponse.json({ success: true, stats });

    } catch (error: any) {
        console.error('Migration failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
