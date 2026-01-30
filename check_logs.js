
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://dfdzeedpufeixcwenoth.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_4qUtGIJ1K2_2I70zecIibw_a7ehmYIl';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    const { data, error } = await supabase.from('logs').select('*').limit(1);
    if (error) console.error(error);
    else console.log('Logs columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No logs');
}
run();
