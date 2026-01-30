
const { createClient } = require('@supabase/supabase-js');

// Credentials
const SUPABASE_URL = 'https://dfdzeedpufeixcwenoth.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_4qUtGIJ1K2_2I70zecIibw_a7ehmYIl';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    try {
        console.log('Fetching one lead to inspect columns...');
        const { data: leads, error } = await supabase
            .from('leads')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error fetching leads:', error);
            return;
        }

        if (leads && leads.length > 0) {
            console.log('Columns found:', Object.keys(leads[0]));
            console.log('Sample Data:', leads[0]);
        } else {
            console.log('No leads found.');
        }

    } catch (e) {
        console.error('Script Error:', e);
    }
}

run();
