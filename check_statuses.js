
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://dfdzeedpufeixcwenoth.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_4qUtGIJ1K2_2I70zecIibw_a7ehmYIl';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    console.log('Fetching distinct statuses...');
    // Fetch all statuses
    const { data, error } = await supabase.from('leads').select('durum');

    if (error) {
        console.error(error);
        return;
    }

    const statuses = {};
    data.forEach(d => {
        statuses[d.durum] = (statuses[d.durum] || 0) + 1;
    });

    console.log('Statuses:', statuses);
}

run();
