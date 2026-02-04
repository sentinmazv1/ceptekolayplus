
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manual Env Parser
try {
    const envPath = path.resolve(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');

    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        }
    });
} catch (e) {
    console.error('Error reading .env.local', e.message);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', SUPABASE_URL ? 'FOUND' : 'MISSING');
console.log('KEY:', SUPABASE_SERVICE_KEY ? 'FOUND' : 'MISSING');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing env vars after manual parse');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function run() {
    console.log('--- Debugging RLS Logic ---');

    // 1. Find a rep (Sales Rep)
    const { data: users, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .neq('role', 'ADMIN')
        .limit(1);

    if (userError) {
        console.error('Error fetching users:', userError);
        return;
    }

    if (!users || users.length === 0) {
        console.log('No non-admin users found. Cannot test personnel logic.');
        return;
    }

    const testUser = users[0];
    console.log(`Testing with User: ${testUser.email} (${testUser.role})`);

    const email = testUser.email;

    // A. Plain Owner Query
    const splitA = await supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('sahip_email', email);
    console.log(`Leads specific owner count (.eq): ${splitA.count}`);

    // B. Creator Query
    const splitB = await supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('created_by', email);
    console.log(`Leads created count (.eq): ${splitB.count}`);

    // C. Combined OR Query - Quoted!
    // Important: Supabase filter syntax for strings with special chars often requires quoting
    const orQuery2 = supabaseAdmin.from('leads')
        .select('id', { count: 'exact', head: true })
        .or(`sahip_email.eq."${email}",created_by.eq."${email}"`);

    const res2 = await orQuery2;
    console.log(`OR Query 2 (Quoted): ${res2.count} (Error: ${res2.error?.message})`);

    // D. Combined OR Query - Unquoted (To verify failure hypothesis)
    const orQuery1 = supabaseAdmin.from('leads')
        .select('id', { count: 'exact', head: true })
        .or(`sahip_email.eq.${email},created_by.eq.${email}`);

    const res1 = await orQuery1;
    console.log(`OR Query 1 (Unquoted): ${res1.count} (Error: ${res1.error?.message})`);
}

run();
