
const { createClient } = require('@supabase/supabase-js');

// Credentials from src/lib/supabase.ts
const SUPABASE_URL = 'https://dfdzeedpufeixcwenoth.supabase.co';
// Trying the hardcoded service key found in source
const SUPABASE_SERVICE_KEY = 'sb_secret_4qUtGIJ1K2_2I70zecIibw_a7ehmYIl';

// Fallback: If the above key is just a placeholder, we might fail. 
// But let's try.

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    try {
        console.log('Connecting to Supabase...');

        // 1. Find Lead
        const phone = '5073993895';
        console.log(`Searching for lead with phone: ${phone}`);

        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('telefon', phone)
            .single();

        if (leadError) {
            console.error('Lead Fetch Error:', leadError.message);
            // If error is authentication, we know the key is bad.
            return;
        }

        if (!lead) {
            console.log('Lead Not Found');
            return;
        }

        console.log('--- LEAD FOUND ---');
        console.log(`ID: ${lead.id}`);
        console.log(`Name: ${lead.ad_soyad}`);
        console.log(`Status: ${lead.durum}`);

        // 2. Fetch Logs
        console.log('\n--- FETCHING LOGS ---');
        const { data: logs, error: logsError } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('lead_id', lead.id)
            .order('created_at', { ascending: false });

        if (logsError) {
            console.error('Logs Fetch Error:', logsError.message);
            return;
        }

        if (logs && logs.length > 0) {
            logs.forEach(l => {
                console.log(`[${l.created_at}] Action: ${l.action} | User: ${l.user_email} | NewVal: ${l.new_value} | Note: ${l.note}`);
            });
        } else {
            console.log('No logs found for this lead.');
        }

    } catch (e) {
        console.error('Unexpected Error:', e);
    }
}

run();
