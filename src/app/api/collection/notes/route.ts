
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');

    if (!leadId) return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });

    const { data, error } = await supabaseAdmin
        .from('collection_notes')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true }); // Chat order

    if (error) return NextResponse.json({ success: false, error: error.message });
    return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { leadId, note } = body;

    if (!leadId || !note) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const { data, error } = await supabaseAdmin
        .from('collection_notes')
        .insert({
            lead_id: leadId,
            user_email: session.user.email,
            note
        })
        .select()
        .single();

    if (error) return NextResponse.json({ success: false, error: error.message });
    return NextResponse.json({ success: true, data });
}
