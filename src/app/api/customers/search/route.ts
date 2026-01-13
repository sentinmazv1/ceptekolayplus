import { NextRequest, NextResponse } from 'next/server';
import { searchCustomers } from '@/lib/leads';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q') || searchParams.get('tc');

        if (!query || query.length < 2) {
            return NextResponse.json({ success: false, message: 'En az 2 karakter giriniz.' }, { status: 400 });
        }

        const matches = await searchCustomers(query);

        if (matches.length === 0) {
            return NextResponse.json({ success: true, found: false, message: 'Kayıt bulunamadı.', customers: [] });
        }

        return NextResponse.json({
            success: true,
            found: true,
            count: matches.length,
            customers: matches
        });

    } catch (error: any) {
        console.error('Search API Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
