const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 1. Load .env.local manually (Robust Logic)
const envPath = path.resolve(__dirname, '.env.local');

if (fs.existsSync(envPath)) {
    console.log('Found .env.local');
    // Try reading as UTF-8 first
    let envContent = fs.readFileSync(envPath).toString('utf8');

    // Check if it looks binary (nul bytes) or BOM, implying UTF-16
    if (envContent.includes('\u0000') || envContent.startsWith('\uFEFF')) {
        console.log('Detected UTF-16 LE encoding, switching read mode...');
        envContent = fs.readFileSync(envPath, 'utf16le');
    }

    // Parse line by line
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            // Remove BOM from key if present (Generic cleanup)
            const cleanKey = key.replace(/^\uFEFF/, '');

            const val = parts.slice(1).join('=').trim().replace(/^"/, '').replace(/"$/, '').replace(/\r$/, '');
            if (cleanKey && !process.env[cleanKey]) {
                process.env[cleanKey] = val;
            }
        }
    });
} else {
    console.log('No .env.local found, checking process.env...');
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is not set!');
    console.error('Keys loaded:', Object.keys(process.env));
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        // Look for SQL file passed as arg, or default
        const sqlFile = process.argv[2] || 'collection_reports.sql';
        console.log(`Reading SQL from ${sqlFile}...`);

        if (!fs.existsSync(sqlFile)) {
            console.error('SQL file not found:', sqlFile);
            process.exit(1);
        }

        const sql = fs.readFileSync(sqlFile, 'utf8');
        console.log('Executing SQL...');

        await client.query(sql);
        console.log('Migration successful!');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.end();
    }
}

run();
