const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCollectionData() {
    console.log('Fetching Gecikme leads...\n');

    const { data: leads, error } = await supabase
        .from('leads')
        .select('id, ad_soyad, tahsilat_durumu, odeme_sozu_tarihi, sinif')
        .eq('sinif', 'Gecikme');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total Gecikme leads: ${leads.length}\n`);

    const today = new Date().toISOString().split('T')[0];

    const grouped = {};
    leads.forEach(lead => {
        const status = lead.tahsilat_durumu || '(empty)';
        const promiseDate = lead.odeme_sozu_tarihi ? lead.odeme_sozu_tarihi.split('T')[0] : null;

        if (!grouped[status]) {
            grouped[status] = [];
        }

        grouped[status].push({
            id: lead.id,
            name: lead.ad_soyad,
            promiseDate,
            isExpired: promiseDate ? promiseDate < today : null
        });
    });

    console.log('Grouped by tahsilat_durumu:\n');
    Object.keys(grouped).sort().forEach(status => {
        console.log(`\n"${status}" (${grouped[status].length}):`);
        grouped[status].forEach(l => {
            console.log(`  - ${l.name} | Promise: ${l.promiseDate || 'none'} | Expired: ${l.isExpired}`);
        });
    });

    process.exit(0);
}

checkCollectionData();
