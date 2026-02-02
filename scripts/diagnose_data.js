
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    console.log('Reading .env.local from:', envPath);
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) {
            const val = values.join('=').trim();
            process.env[key.trim()] = val.replace(/^["'](.+)["']$/, '$1'); // Remove quotes
        }
    });
} else {
    console.error('.env.local not found at:', envPath);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars:', { url: !!supabaseUrl, key: !!supabaseServiceKey });
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
