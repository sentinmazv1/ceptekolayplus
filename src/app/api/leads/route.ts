import { NextRequest, NextResponse } from 'next/server';
import { getLeads } from '@/lib/leads';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const durum = searchParams.get('durum');
        const sahip = searchParams.get('sahip');

        const filters: any = {};
        if (durum) filters.durum = durum;
        if (sahip) filters.sahip = sahip;

        const leads = await getLeads(filters);

        return NextResponse.json({ success: true, leads });
    } catch (error: any) {
        console.error('Leads fetch error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
