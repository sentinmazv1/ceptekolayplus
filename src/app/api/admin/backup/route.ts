import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const backup: any = {
            metadata: {
                backup_date: new Date().toISOString(),
                version: '1.0',
                app: 'CEPTEKOLAY Plus'
            },
            data: {}
        };

        // 1. LEADS (Müşteriler)
        const { data: leads, error: leadsError } = await supabaseAdmin
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (leadsError) throw leadsError;
        backup.data.leads = leads;

        // 2. INVENTORY (Stok)
        const { data: inventory, error: invError } = await supabaseAdmin
            .from('inventory')
            .select('*')
            .order('giris_tarihi', { ascending: false });

        if (invError) throw invError;
        backup.data.inventory = inventory;

        // 3. ACTIVITY LOGS (İşlem Kayıtları) - Fetch last 10000 to avoid timeout/memory issues
        const { data: logs, error: logsError } = await supabaseAdmin
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10000);

        if (logsError) throw logsError;
        backup.data.logs = logs;

        // 4. SMS TEMPLATES (Şablonlar)
        const { data: templates, error: templatesError } = await supabaseAdmin
            .from('sms_templates')
            .select('*');

        if (templatesError) throw templatesError;
        backup.data.sms_templates = templates;

        // 5. USERS (Kullanıcılar)
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('*');

        if (usersError) throw usersError;
        backup.data.users = users;

        // 6. STATUSES (Durumlar)
        const { data: statuses, error: statusError } = await supabaseAdmin
            .from('statuses')
            .select('*');

        if (statusError) throw statusError;
        backup.data.statuses = statuses;

        // 7. PRODUCTS (Ürünler)
        const { data: products, error: productsError } = await supabaseAdmin
            .from('products')
            .select('*');

        if (productsError) throw productsError;
        backup.data.products = products;

        // 8. QUICK NOTES
        const { data: quickNotes, error: notesError } = await supabaseAdmin
            .from('quick_notes')
            .select('*');

        if (notesError) throw notesError;
        backup.data.quick_notes = quickNotes;

        // Return JSON file
        return new NextResponse(JSON.stringify(backup, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="ceptekolay-backup-${timestamp}.json"`
            }
        });

    } catch (error: any) {
        console.error('Backup error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
