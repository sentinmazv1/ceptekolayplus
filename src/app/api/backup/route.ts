
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getReportData, getAllLogs } from '@/lib/leads';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [leads, logs] = await Promise.all([
            getReportData(),
            getAllLogs()
        ]);

        const backupData = {
            generated_at: new Date().toISOString(),
            source: 'Supabase',
            data: {
                customers: leads,
                logs: logs
            }
        };

        const json = JSON.stringify(backupData, null, 2);

        return new NextResponse(json, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="backup_full_${new Date().toISOString().split('T')[0]}.json"`
            }
        });

    } catch (error: any) {
        console.error('Backup Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
