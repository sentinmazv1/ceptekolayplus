
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Fallback logic
const HARDCODED_URL = 'https://dfdzeedpufeixcwenoth.supabase.co';
const HARDCODED_SERVICE = 'sb_secret_4qUtGIJ1K2_2I70zecIibw_a7ehmYIl';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || HARDCODED_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || HARDCODED_SERVICE;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    process.stdout.write("Checking schema...\n");
    // Just fetch one row to see types roughly, or try to select pg_typeof
    const { data, error } = await supabase.from('leads').select('satilan_urunler').limit(1);
    if (error) console.error(error);
    else {
        console.log('Sample Data:', data);
        console.log('Type check: typeof satilan_urunler is', typeof data[0]?.satilan_urunler);
    }
}

checkSchema();
