import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('sms_templates')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) {
            console.error('Error fetching SMS templates:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Format for frontend compatibility
        const templates = data.map(t => ({
            id: t.id.toString(),
            name: t.name,
            message: t.message
        }));

        return NextResponse.json({ success: true, templates });
    } catch (error: any) {
        console.error('Error in SMS templates API:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
