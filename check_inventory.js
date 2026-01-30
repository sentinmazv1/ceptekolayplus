
const { createClient } = require('@supabase/supabase-js');

// Credentials from src/lib/supabase.ts
const SUPABASE_URL = 'https://dfdzeedpufeixcwenoth.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_4qUtGIJ1K2_2I70zecIibw_a7ehmYIl';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    try {
        console.log('Connecting to Supabase...');

        console.log('Fetching last 5 inventory items...');
        const { data: items, error } = await supabase
            .from('inventory')
            .select('id, marka, model, imei, seri_no, created_at, giris_tarihi')
            .order('giris_tarihi', { ascending: false })
            .limit(5);

        if (error) {
            console.error('Error fetching inventory:', error);
            // Try fetching with just * to see columns
            const { data: allItems, error: allError } = await supabase
                .from('inventory')
                .select('*')
                .order('giris_tarihi', { ascending: false })
                .limit(1);

            if (allError) console.error('Error fetching *:', allError);
            else console.log('First item columns:', Object.keys(allItems[0]));

            return;
        }

        console.log('--- RECENT INVENTORY ITEMS ---');
        items.forEach(item => {
            console.log(`[${item.giris_tarihi}] Marka: ${item.marka} | Model: ${item.model} | IMEI: ${item.imei} | SN: ${item.seri_no}`);
        });

    } catch (e) {
        console.error('Unexpected Error:', e);
    }
}

run();
