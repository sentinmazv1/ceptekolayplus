
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function diagnose() {
    console.log('--- DIAGNOSTIC START ---');
    console.log('URL:', supabaseUrl);

    // 1. Check Inventory (Should be non-zero always)
    const { count: inventoryCount, error: invError } = await supabaseAdmin
        .from('inventory')
        .select('*', { count: 'exact', head: true });

    console.log('Inventory Count:', inventoryCount);
    if (invError) console.error('Inv Error:', invError);

    // 2. Check Leads
    const { count: leadsCount, error: leadsError } = await supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact', head: true });

    console.log('Leads Count:', leadsCount);
    if (leadsError) console.error('Leads Error:', leadsError);

    // 3. Check Logs
    const { count: logsCount, error: logsError } = await supabaseAdmin
        .from('activity_logs')
        .select('*', { count: 'exact', head: true });

    console.log('Logs Count:', logsCount);
    if (logsError) console.error('Logs Error:', logsError);

    console.log('--- DIAGNOSTIC END ---');
}

diagnose();
