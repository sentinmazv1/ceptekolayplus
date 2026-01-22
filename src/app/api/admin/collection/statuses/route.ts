
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabaseAdmin
        .from('collection_statuses')
        .select('*')
        .order('sort_order', { ascending: true });

    if (error) return NextResponse.json({ success: false, error: error.message });
    return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role || '';
    if (!session || !['ADMIN', 'Yönetici', 'admin', 'yonetici'].includes(role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { label, color } = await req.json();

    const { data: maxOrder } = await supabaseAdmin.from('collection_statuses').select('sort_order').order('sort_order', { ascending: false }).limit(1).single();
    const nextOrder = (maxOrder?.sort_order || 0) + 1;

    const { data, error } = await supabaseAdmin
        .from('collection_statuses')
        .insert({ label, color, sort_order: nextOrder })
        .select()
        .single();

    if (error) return NextResponse.json({ success: false, error: error.message });
    return NextResponse.json({ success: true, data });
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role || '';
    if (!session || !['ADMIN', 'Yönetici', 'admin', 'yonetici'].includes(role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const { error } = await supabaseAdmin.from('collection_statuses').delete().eq('id', id);
    if (error) return NextResponse.json({ success: false, error: error.message });
    return NextResponse.json({ success: true });
}
