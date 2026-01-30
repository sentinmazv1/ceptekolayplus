
const { createClient } = require('@supabase/supabase-js');

// Credentials
const SUPABASE_URL = 'https://dfdzeedpufeixcwenoth.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_4qUtGIJ1K2_2I70zecIibw_a7ehmYIl';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    try {
        console.log('Fetching distinct attorney check results...');
        // We can't do distinct easily with Supabase client-side w/o RPC, so we'll fetch a batch and agg in JS
        const { data: leads, error } = await supabase
            .from('leads')
            .select('avukat_sorgu_sonuc')
            .not('avukat_sorgu_sonuc', 'is', null)
            .limit(1000);

        if (error) {
            console.error('Error fetching leads:', error);
            return;
        }

        const counts = {};
        leads.forEach(l => {
            const res = l.avukat_sorgu_sonuc;
            counts[res] = (counts[res] || 0) + 1;
        });

        console.log('Attorney Check Result Distribution:', counts);

    } catch (e) {
        console.error('Script Error:', e);
    }
}

run();
