
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Simple dotenv parser
const envPath = path.resolve(process.cwd(), '.env.local');
let env = {};
console.log('Looking for env at:', envPath);
if (fs.existsSync(envPath)) {
    console.log('Found .env.local');
    // Try reading as UTF-16LE first
    let raw = fs.readFileSync(envPath, 'ucs2'); // ucs2 is alias for utf16le

    // If it doesn't look like valid connection string (e.g. valid keys), purely fallback or just replace nulls if it was mixed?
    // Actually, simple check: if it has lots of nulls, it's utf16. If not, maybe it was utf8?
    // Let's rely on the user's evidence.
    // If it fails, we might get garbage.

    // Fallback: If 'raw' looks garbage-y (chk first char), maybe try utf8.
    // But the log showed \x00, so it IS utf16.

    // Split by newlines. In JS, if we read correct encoding, \n is \n.
    raw.split(/\r?\n/).forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const k = parts[0].trim();
            const v = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
            if (k && v) env[k] = v;
        }
    });
} else {
    console.log('Refusing to run: .env.local not found at ' + envPath);
}
console.log('Loaded ENV Keys:', Object.keys(env)); // DEBUG

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Env Vars. Expected NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
    const todayStr = new Date().toISOString().split('T')[0]; // 2026-01-22

    console.log(`Inspecting deliveries for: ${todayStr}`);

    const { data: leads, error } = await supabase
        .from('leads')
        .select('id, ad_soyad, durum, sinif, teslim_tarihi, created_at, urun_imei')
        .or('durum.eq.Teslim edildi,durum.eq.Satış yapıldı/Tamamlandı')
        .ilike('teslim_tarihi', `${todayStr}%`);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${leads?.length} leads delivered today.`);

    if (leads && leads.length > 0) {
        console.table(leads.map(l => ({
            id: l.id,
            name: l.ad_soyad.substring(0, 20),
            status: l.durum,
            class: l.sinif, // This is the key clue
            imei: l.urun_imei ? 'YES' : 'NO',
            created: l.created_at ? l.created_at.split('T')[0] : '?',
            delivered: l.teslim_tarihi
        })));
    }
}

inspect();
