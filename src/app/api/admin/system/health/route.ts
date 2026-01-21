import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    try {
        // 1. Get Row Counts
        const { count: leadsCount, error: leadsError } = await supabaseAdmin
            .from('leads')
            .select('*', { count: 'exact', head: true });

        const { count: logsCount, error: logsError } = await supabaseAdmin
            .from('logs')
            .select('*', { count: 'exact', head: true });

        const { count: templatesCount, error: templatesError } = await supabaseAdmin
            .from('sms_templates')
            .select('*', { count: 'exact', head: true });

        const { count: inventoryCount, error: inventoryError } = await supabaseAdmin
            .from('inventory')
            .select('*', { count: 'exact', head: true });

        // 2. Database Size Estimation (Postgres specific)
        // Note: Raw SQL might not work if permissions are restricted, but we can try via RPC or a custom function if needed.
        // For now, we'll provide counts and estimated weight.
        const avgLeadSize = 1024; // ~1KB per lead
        const avgLogSize = 512;   // ~0.5KB per log

        const estimatedBytes = (leadsCount || 0) * avgLeadSize + (logsCount || 0) * avgLogSize;
        const estimatedMB = Number((estimatedBytes / (1024 * 1024)).toFixed(2));

        return NextResponse.json({
            counts: {
                leads: leadsCount || 0,
                logs: logsCount || 0,
                templates: templatesCount || 0,
                inventory: inventoryCount || 0
            },
            storage: {
                estimatedMB,
                limitMB: 500,
                usagePercent: Math.min(100, (estimatedMB / 500) * 100)
            }
        });

    } catch (error: any) {
        console.error('System Health API Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
