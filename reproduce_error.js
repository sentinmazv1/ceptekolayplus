
const { createClient } = require('@supabase/supabase-js');

// Credentials
const SUPABASE_URL = 'https://dfdzeedpufeixcwenoth.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_4qUtGIJ1K2_2I70zecIibw_a7ehmYIl';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    try {
        console.log('Fetching an item...');
        const { data: items } = await supabase.from('inventory').select('id').limit(1);

        if (!items || items.length === 0) {
            console.log('No items to test');
            return;
        }

        const id = items[0].id;
        console.log('Testing update on ID:', id);

        const updates = {
            fiyat_3_taksit: "" // INTENTIONAL ERROR: Empty string for numeric
        };

        const { data, error } = await supabase
            .from('inventory')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            console.error('EXPECTED ERROR OBTAINED:', error);
        } else {
            console.log('Success? That is unexpected.', data);
        }

    } catch (e) {
        console.error('Script Error:', e);
    }
}

run();
