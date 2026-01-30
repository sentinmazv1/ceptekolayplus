import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET: Fetch current pricing config
export async function GET() {
    try {
        const supabase = createRouteHandlerClient({ cookies });

        const { data, error } = await supabase
            .from('pricing_config')
            .select('*')
            .limit(1)
            .single();

        if (error) {
            // If strictly no rows, return defaults (though schema insert should prevent this)
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
        const supabase = createRouteHandlerClient({ cookies });

        // check auth & role
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Verify Admin role
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('email', session.user.email)
            .single();

        if (userData?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { multiplier_15, divisor_12, divisor_6, divisor_3 } = body;

        // Basic validation
        if (!multiplier_15 || !divisor_12 || !divisor_6 || !divisor_3) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Upsert logic (since we only want one row essentially, getting the ID would be safer, 
        // but since we want to "Update the *the* config", we can validly assume existing row or insert new)

        // First check if a config exists
        const { data: existing } = await supabase
            .from('pricing_config')
            .select('id')
            .limit(1)
            .single();

        let result;
        if (existing) {
            result = await supabase
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
            result = await supabase
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
