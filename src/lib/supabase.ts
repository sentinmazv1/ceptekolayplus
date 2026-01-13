
import { createClient } from '@supabase/supabase-js';

// FALLBACK CREDENTIALS (TEMPORARY FOR MIGRATION)
// Used when environment variables are missing (e.g. Vercel Build Step)
const HARDCODED_URL = 'https://dfdzeedpufeixcwenoth.supabase.co';
const HARDCODED_ANON = 'sb_publishable_yX2gu1iS-DovslDuSl68Jg_q8-gNdcr';
const HARDCODED_SERVICE = 'sb_secret_4qUtGIJ1K2_2I70zecIibw_a7ehmYIl';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || HARDCODED_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || HARDCODED_ANON;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || HARDCODED_SERVICE;

// Admin client with full privileges (Service Role)
export const supabaseAdmin = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Standard client (Anon)
export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
