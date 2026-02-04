import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDashboardStatsCounts, getLeadsForDashboard, mapRowToCustomer } from '@/lib/leads';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const isAdmin = userEmail === 'ibrahimsentinmaz@gmail.com' || userEmail === 'admin';

    try {
        const { searchParams } = new URL(req.url);
        const action = searchParams.get('action'); // 'stats' or 'list'

        if (action === 'stats') {
            const stats = await getDashboardStatsCounts(userEmail, isAdmin);
            return NextResponse.json({ stats });
        }
        else if (action === 'list') {
            const type = searchParams.get('type');
            let status = '';

            if (type === 'APPROVED') status = 'Onaylandı';
            else if (type === 'GUARANTOR') status = 'Kefil bekleniyor';
            // For DELIVERED, it's more complex (date range + mulit status), let's keep it simple or expand helper?
            // User just wants to see the list. My helper supports status.
            // But Delivered needs date check? 
            // Actually, handleBadgeClick passed 'DELIVERED', but getLeadsForDashboard only takes status.
            // Let's rely on getLeadsForDashboard but maybe improve it later or just show all Delivered?
            // The dashboard box shows *This Month* delivered. The list should probably show that too.
            // Use manual logic here or expand helper? 
            // Let's use getLeadsForDashboard for consistency but careful with Delivered.

            // Re-eval: getLeadsForDashboard is simple OR query. 
            // If type is DELIVERED, we need special handling.

            if (type === 'DELIVERED') {
                // Special case relying on imported logic? 
                // Or just replicate correct logic here using shared base?
                // Let's use the helper for isolation but build the query manually here since it's cleaner than over-engineering the helper now.
                // Actually, I can use getDashboardStatsCounts logic pattern.
            }

            // Wait, I can just use getLeadsForDashboard and filter in memory if the list is small (limit 200)? 
            // No, better to filter in DB.

            // Let's update the API to use the helper for generic, but if DELIVERED, do manual to ensure date range.
            // BUT wait, getLeadsForDashboard is new. I can modify it to accept multiple statuses or dates?
            // Or just inline the logic here using `supabaseAdmin` directly again but using the exact SAME filter string as the helper.

            // Actually, to ensure exact consistency with the stats count, let's keep the logic close.
            // I will implement list retrieval here re-using the exact "baseFilter" concept.

            const { supabaseAdmin } = await import('@/lib/supabase'); // Dynamic import to avoid circular dep if any? No.

            let query = supabaseAdmin.from('leads').select('*').order('updated_at', { ascending: false }).limit(1000);

            // 1. ISOLATION
            if (!isAdmin) {
                query = query.or(`sahip_email.eq.${userEmail},created_by.eq.${userEmail}`);
            }

            // 2. TYPE FILTER
            if (type === 'APPROVED') {
                query = query.eq('durum', 'Onaylandı');
            } else if (type === 'GUARANTOR') {
                query = query.eq('durum', 'Kefil bekleniyor');
            } else if (type === 'DELIVERED') {
                // Removed date filter as requested - Show ALL TIME delivered
                query = query.or('durum.eq.Teslim edildi,durum.eq.Satış yapıldı/Tamamlandı');
            }

            const { data, error } = await query;
            if (error) throw error;

            return NextResponse.json({ list: (data || []).map(mapRowToCustomer) });
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
