
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    // Prevent crash during build if vars missing, but warn
    if (process.env.NODE_ENV !== 'production') {
        console.warn('Supabase env vars missing!');
    }
}

// Admin client with full privileges (Service Role)
// We use this because our Next.js API routes are already protected by NextAuth
export const supabaseAdmin = createClient(
    SUPABASE_URL || '',
    SUPABASE_SERVICE_KEY || '',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Standard client (Anon) - Optional for now, mostly using Admin for migration/backend ops
export const supabase = createClient(
    SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);
