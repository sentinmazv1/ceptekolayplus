
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ message: 'No session found' });
    }

    // Fetch what's in the DB for this email
    const { data: dbUser, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .single();

    return NextResponse.json({
        session: {
            email: session.user.email,
            role: session.user.role,
            name: session.user.name
        },
        database: {
            found: !!dbUser,
            role: dbUser?.role,
            email: dbUser?.email,
            created_at: dbUser?.created_at,
            updated_at: dbUser?.updated_at
        },
        dbError: error ? error.message : null
    });
}
