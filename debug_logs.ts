
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkLogs() {
    const client = new Client({
        connectionString: process.env.POSTGRES_URL + "?sslmode=require",
    });

    try {
        await client.connect();
        console.log("Connected to DB");

        const res = await client.query(`
            SELECT action, old_value, new_value, note, user_email, timestamp, customer_id
            FROM logs 
            WHERE timestamp::date = CURRENT_DATE 
            ORDER BY timestamp DESC 
            LIMIT 50;
        `);

        console.log("--- LATEST LOGS (TODAY) ---");
        res.rows.forEach(r => {
            console.log(`[${r.timestamp.toISOString()}] User: ${r.user_email} | Action: ${r.action} | ID: ${r.customer_id}`);
            console.log(`   Old: ${r.old_value} -> New: ${r.new_value}`);
            if (r.note) console.log(`   Note: ${r.note}`);
            console.log('---');
        });

        // Check Inventory Stats
        const invRes = await client.query(`
            SELECT 
                COUNT(*) as total_items,
                SUM(alis_fiyati) as total_cost,
                SUM(satis_fiyati) as total_revenue
            FROM inventory_items
            WHERE durum = 'STOKTA'
        `);
        console.log("--- INVENTORY STATS ---");
        console.log(invRes.rows[0]);


    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

checkLogs();
