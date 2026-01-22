import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { data, error } = await supabaseAdmin
            .from('cancellation_reasons')
            .select('*')
            .eq('is_active', true)
            .order('reason', { ascending: true });

        if (error) {
            // Table might not exist yet
            if (error.code === '42P01') { // undefined_table
                return NextResponse.json({ success: true, reasons: [] }); // Graceful fallback
            }
            throw error;
        }

        return NextResponse.json({ success: true, reasons: data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { reason } = body;

        if (!reason || reason.trim().length === 0) {
            return NextResponse.json({ success: false, message: 'Reason is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('cancellation_reasons')
            .insert([{ reason: reason.trim() }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, reason: data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });

        // Soft delete or Hard delete? User asked for "sil".
        // Let's do Soft Delete (is_active = false) to keep history valid? 
        // Or Hard Delete if unused?
        // Let's do Hard Delete for simplicity as per request "sil", 
        // but typically better to soft delete. I'll stick to DELETE for now.

        const { error } = await supabaseAdmin
            .from('cancellation_reasons')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
