
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        // 1. Find Lead
        const phone = '5073993895';
        const leadRes = await client.query("SELECT * FROM leads WHERE telefon = $1", [phone]);

        if (leadRes.rows.length === 0) {
            console.log('Lead NOT FOUND for phone:', phone);
            return;
        }

        const lead = leadRes.rows[0];
        console.log('--- LEAD INFO ---');
        console.log('ID:', lead.id);
        console.log('Name:', lead.ad_soyad);
        console.log('Status:', lead.durum);
        console.log('Created At:', lead.created_at);

        // 2. Find Logs
        console.log('\n--- ACTIVITY LOGS ---');
        const logsRes = await client.query("SELECT * FROM activity_logs WHERE lead_id = $1 ORDER BY created_at DESC", [lead.id]);

        logsRes.rows.forEach(log => {
            console.log(`[${log.created_at}] Action: ${log.action} | User: ${log.user_email} | NewVal: ${log.new_value}`);
        });

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

run();
