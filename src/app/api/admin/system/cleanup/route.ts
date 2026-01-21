import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { action } = body;

        if (action !== 'CLEANUP_LOGS') {
            return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
        }

        // Calculate date 3 months ago
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const { error, count } = await supabaseAdmin
            .from('activity_logs')
            .delete({ count: 'exact' })
            .lt('created_at', threeMonthsAgo.toISOString());

        if (error) {
            console.error('Cleanup Error:', error);
            return NextResponse.json({ message: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            deletedCount: count || 0,
            message: `${count || 0} adet eski log kaydı başarıyla silindi.`
        });

    } catch (error: any) {
        console.error('System Cleanup API Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
