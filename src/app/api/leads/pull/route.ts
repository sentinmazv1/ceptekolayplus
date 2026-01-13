import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { lockNextLead } from '@/lib/leads';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const lead = await lockNextLead(session.user.email);

        if (!lead) {
            return NextResponse.json({ message: 'Havuzda yeni müşteri kalmadı.' }, { status: 404 });
        }

        return NextResponse.json({ lead });
    } catch (error) {
        console.error('Pull lead error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
