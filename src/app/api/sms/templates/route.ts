import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('sms_templates')
            .select('*')
            .eq('is_active', true)
            .order('title');

        if (error) {
            console.error('Error fetching SMS templates:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Format for frontend compatibility - map database fields to expected format
        const templates = data.map(t => ({
            id: t.id.toString(),
            name: t.title,        // Database uses 'title'
            message: t.content    // Database uses 'content'
        }));

        return NextResponse.json({ success: true, templates });
    } catch (error: any) {
        console.error('Error in SMS templates API:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
