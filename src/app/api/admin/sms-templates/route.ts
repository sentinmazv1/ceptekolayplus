import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
        .from('sms_templates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates: data });
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { action, id, title, content, tags } = body;

        if (action === 'delete') {
            if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });

            const { error } = await supabaseAdmin.from('sms_templates').delete().eq('id', id);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        if (!title || !content) {
            return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
        }

        const payload = { title, content, tags };

        let result;
        if (id) {
            // Update
            const { data, error } = await supabaseAdmin
                .from('sms_templates')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            result = data;
        } else {
            // Create
            const { data, error } = await supabaseAdmin
                .from('sms_templates')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            result = data;
        }

        return NextResponse.json({ template: result });

    } catch (error: any) {
        console.error('Template Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
