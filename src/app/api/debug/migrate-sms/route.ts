import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        await query(`
            ALTER TABLE customers 
            ADD COLUMN IF NOT EXISTS telefon_onayli BOOLEAN DEFAULT FALSE;
        `);
        return NextResponse.json({ success: true, message: 'Migration successful' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
