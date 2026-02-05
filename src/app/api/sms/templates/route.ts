import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Fetch all templates (removed is_active filter as it might not exist)
        const { data, error } = await supabaseAdmin
            .from('sms_templates')
            .select('*')
            .order('title');

        if (error) {
            console.error('Error fetching SMS templates:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        console.log('Fetched SMS templates:', data); // Debug log

        // Format for frontend compatibility - map database fields to expected format
        const templates = data?.map(t => ({
            id: t.id.toString(),
            name: t.title,        // Database uses 'title'
            message: t.content    // Database uses 'content'
        })) || [];

        console.log('Formatted templates:', templates); // Debug log

        return NextResponse.json({ success: true, templates });
    } catch (error: any) {
        console.error('Error in SMS templates API:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
