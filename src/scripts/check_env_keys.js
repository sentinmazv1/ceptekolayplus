
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');

try {
    const raw = fs.readFileSync(envPath, 'ucs2');
    console.log('--- START ENV ---');
    raw.split(/\r?\n/).forEach(line => {
        const parts = line.split('=');
        if (parts.length > 0) {
            const key = parts[0].trim().replace(/\0/g, '');
            if (key === 'DATABASE_URL') {
                console.log('DATABASE_URL FOUND');
            } else if (key) {
                console.log('Key:', key);
            }
        }
    });
    console.log('--- END ENV ---');
} catch (e) {
    console.error('Error reading env:', e);
}
