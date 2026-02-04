import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    // Admin check - centralized logic or simple check
    const isAdmin = userEmail === 'ibrahimsentinmaz@gmail.com' || userEmail === 'admin';

    try {
        const { searchParams } = new URL(req.url);
        const action = searchParams.get('action'); // 'stats' or 'list'

        // Helper to apply isolation
        const applyIsolation = (query: any) => {
            if (!isAdmin) {
                // Return query with filter: sahib OR created_by
                return query.or(`sahip.eq.${userEmail},created_by.eq.${userEmail}`);
            }
            return query;
        };

        if (action === 'stats') {
            // 1. Approved
            let approvedQuery = supabaseAdmin
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('durum', 'Onaylandı');

            approvedQuery = applyIsolation(approvedQuery);
            const { count: approvedCount } = await approvedQuery;

            // 2. Guarantor
            let guarantorQuery = supabaseAdmin
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('durum', 'Kefil bekleniyor');

            guarantorQuery = applyIsolation(guarantorQuery);
            const { count: guarantorCount } = await guarantorQuery;

            // 3. Delivered (This Month)
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            let deliveredQuery = supabaseAdmin
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .or('durum.eq.Teslim edildi,durum.eq.Satış yapıldı/Tamamlandı')
                .gte('teslim_tarihi', startOfMonth);

            deliveredQuery = applyIsolation(deliveredQuery);
            const { count: deliveredCount } = await deliveredQuery;

            return NextResponse.json({
                stats: {
                    approved: approvedCount || 0,
                    guarantor: guarantorCount || 0,
                    delivered: deliveredCount || 0
                }
            });
        }
        else if (action === 'list') {
            const type = searchParams.get('type'); // 'APPROVED', 'GUARANTOR', 'DELIVERED'

            let query = supabaseAdmin
                .from('leads')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(50);

            query = applyIsolation(query);

            if (type === 'APPROVED') {
                query = query.eq('durum', 'Onaylandı');
            } else if (type === 'GUARANTOR') {
                query = query.eq('durum', 'Kefil bekleniyor');
            } else if (type === 'DELIVERED') {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                query = query
                    .or('durum.eq.Teslim edildi,durum.eq.Satış yapıldı/Tamamlandı')
                    .gte('teslim_tarihi', startOfMonth);
            } else {
                return NextResponse.json({ message: 'Invalid type' }, { status: 400 });
            }

            const { data, error } = await query;
            if (error) throw error;

            return NextResponse.json({ list: data });
        }

        return NextResponse.json({ message: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Dashboard Stats API Error:', error);
        return NextResponse.json(
            { message: error.message || 'Error fetching stats' },
            { status: 500 }
        );
    }
}
