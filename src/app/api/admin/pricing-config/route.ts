import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase';

// Helper to check auth
async function checkAdmin() {
    const session = await getServerSession();
    if (!session || !session.user) return false;

    // In this project, role is often on session.user (customized NextAuth)
    // Or we check DB. Let's assume session.user.role is populated as per standard implementation here
    // If not, we can query users table.

    // Check against "ADMIN"
    return (session.user as any).role === 'ADMIN';
}

// GET: Fetch current pricing config
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('pricing_config')
            .select('*')
            .limit(1)
            .single();

        if (error) {
            // If strictly no rows, return defaults
            if (error.code === 'PGRST116') {
                return NextResponse.json({
                    multiplier_15: 2.60,
                    divisor_12: 1.05,
                    divisor_6: 1.10,
                    divisor_3: 1.10
                });
            }
            throw error;
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching pricing config:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pricing config' },
            { status: 500 }
        );
    }
}

// POST: Update pricing config (Admin Only)
export async function POST(req: Request) {
    try {
        const isAdmin = await checkAdmin();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { multiplier_15, divisor_12, divisor_6, divisor_3 } = body;

        // Basic validation
        if (!multiplier_15 || !divisor_12 || !divisor_6 || !divisor_3) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // First check if a config exists
        const { data: existing } = await supabaseAdmin
            .from('pricing_config')
            .select('id')
            .limit(1)
            .single();

        let result;
        if (existing) {
            console.log('Updating existing config:', existing.id);
            result = await supabaseAdmin
                .from('pricing_config')
                .update({
                    multiplier_15,
                    divisor_12,
                    divisor_6,
                    divisor_3,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();
        } else {
            console.log('Creating new config');
            result = await supabaseAdmin
                .from('pricing_config')
                .insert({
                    multiplier_15,
                    divisor_12,
                    divisor_6,
                    divisor_3
                })
                .select()
                .single();
        }

        if (result.error) throw result.error;

        return NextResponse.json({ success: true, data: result.data });

    } catch (error) {
        console.error('Error updating pricing config:', error);
        return NextResponse.json(
            { error: 'Failed to update configuration' },
            { status: 500 }
        );
    }
}
