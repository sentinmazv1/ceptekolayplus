
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, role, created_at')
        .order('name');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { email, password, name, role } = body;

        // Validation
        if (!email || !password || !name) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Insert
        const { data, error } = await supabaseAdmin
            .from('users')
            .insert({
                email,
                password, // Storing plain text as requested for now
                name,
                role
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ success: false, error: error.message });
        }

        return NextResponse.json({ success: true, user: data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, email, password, name, role } = body;

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const updates: any = { email, name, role };
        // Only update password if provided and not empty
        if (password && password.trim() !== '') {
            updates.password = password;
        }

        const { error } = await supabaseAdmin
            .from('users')
            .update(updates)
            .eq('id', id);

        if (error) return NextResponse.json({ success: false, error: error.message });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
