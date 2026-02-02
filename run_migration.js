const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 1. Load .env.local manually (Robust Logic)
const envPath = path.resolve(__dirname, '.env.local');

if (fs.existsSync(envPath)) {
    console.log('Found .env.local');
    try {
        const fileBuffer = fs.readFileSync(envPath);
        let envContent = '';

        // Check for UTF-16 LE BOM (FF FE)
        if (fileBuffer.length >= 2 && fileBuffer[0] === 0xFF && fileBuffer[1] === 0xFE) {
            console.log('Detected UTF-16 LE BOM');
            envContent = fileBuffer.toString('utf16le');
        } else if (fileBuffer.includes(0x00)) {
            console.log('Detected Null bytes, assuming UTF-16 LE');
            envContent = fileBuffer.toString('utf16le');
        } else {
            envContent = fileBuffer.toString('utf8');
        }

        const lines = envContent.split(/\r?\n/);
        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;

            const parts = trimmed.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                let val = parts.slice(1).join('=').trim();

                // Remove quotes
                if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
                else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);

                if (key && !process.env[key]) {
                    process.env[key] = val;
                }
            }
        });
    } catch (err) {
        console.error('Error reading .env.local:', err);
    }
} else {
    console.log('No .env.local found, checking process.env...');
}

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error('DATABASE_URL is not set!');
    console.error('Keys loaded:', Object.keys(process.env).filter(k => !k.startsWith('npm_') && !k.startsWith('Program')));
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

        // Look for SQL file passed as arg
        const sqlFile = process.argv[2];
        if (!sqlFile) {
            console.error('Please provide an SQL file as argument');
            process.exit(1);
        }

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
