
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Simple dotenv parser
const envPath = path.resolve(process.cwd(), '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
    // Basic logic to read utf8 or ucs2
    try {
        const raw = fs.readFileSync(envPath, 'utf8');
        raw.split(/\r?\n/).forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const k = parts[0].trim();
                const v = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                if (k && v) env[k] = v;
            }
        });
    } catch (e) { }
}

// Fallback logic extracted from src/lib/supabase.ts
const HARDCODED_URL = 'https://dfdzeedpufeixcwenoth.supabase.co';
const HARDCODED_SERVICE = 'sb_secret_4qUtGIJ1K2_2I70zecIibw_a7ehmYIl';

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || HARDCODED_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || HARDCODED_SERVICE;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Env Vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log("Checking schema...");
    const { data, error } = await supabase.from('leads').select('satilan_urunler').limit(1);
    if (error) console.error(error);
    else {
        console.log('Sample Data:', JSON.stringify(data));
        if (data && data.length > 0) {
            const val = data[0].satilan_urunler;
            console.log('Value:', val);
            console.log('Type:', typeof val);
        }
    }
}

checkSchema();
