// TRIGGER VERCEL DEPLOYMENT - SYSTEM BACKUP FIX
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

        const timestamp = new Date().toISOString().split('T')[0];
        const backup: any = {
            metadata: {
                backup_date: new Date().toISOString(),
                version: '1.2',
                app: 'CEPTEKOLAY Plus',
                environment: process.env.NODE_ENV
            },
            data: {},
            errors: [] // Track missing tables or errors
        };

        // Helper for safe table fetching
        const fetchTable = async (tableName: string, queryBuilder?: (q: any) => any) => {
            try {
                let query = supabaseAdmin.from(tableName).select('*');
                if (queryBuilder) query = queryBuilder(query);

                const { data, error } = await query;
                if (error) {
                    console.warn(`[Backup] Table ${tableName} fetch error:`, error.message);
                    backup.errors.push({ table: tableName, error: error.message });
                    return null;
                }
                return data;
            } catch (err: any) {
                console.error(`[Backup] Critical error fetching ${tableName}:`, err);
                backup.errors.push({ table: tableName, error: err.message });
                return null;
            }
        };

        // Parallel fetch for speed
        const [
            leads, inventory, logs, templates,
            users, statuses, products, quickNotes
        ] = await Promise.all([
            fetchTable('leads', q => q.order('created_at', { ascending: false })),
            fetchTable('inventory', q => q.order('giris_tarihi', { ascending: false })),
            fetchTable('activity_logs', q => q.order('created_at', { ascending: false }).limit(10000)),
            fetchTable('sms_templates'),
            fetchTable('users'),
            fetchTable('statuses'),
            fetchTable('products'),
            fetchTable('quick_notes')
        ]);

        backup.data = {
            leads: leads || [],
            inventory: inventory || [],
            activity_logs: logs || [],
            sms_templates: templates || [],
            users: users || [],
            statuses: statuses || [],
            products: products || [],
            quick_notes: quickNotes || []
        };

        // Return JSON file
        return new NextResponse(JSON.stringify(backup, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="ceptekolay-backup-${timestamp}.json"`
            }
        });

    } catch (error: any) {
        console.error('Final Backup Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
