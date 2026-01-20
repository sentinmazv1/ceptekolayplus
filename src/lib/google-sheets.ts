
import { google } from 'googleapis';

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

// Robust Private Key Sanitization
function sanitizePrivateKey(key: string | undefined): string | undefined {
    if (!key) return undefined;

    let sanitized = key;

    // 1. Recursively remove surrounding quotes (double or single)
    //    Some environments add extra quotes, or users copy them from .env examples
    while (
        (sanitized.startsWith('"') && sanitized.endsWith('"')) ||
        (sanitized.startsWith("'") && sanitized.endsWith("'"))
    ) {
        sanitized = sanitized.slice(1, -1);
    }

    // 2. Handle escaped newlines
    //    Env vars often come as "line1\nline2", we need actual newlines for the PEM format
    sanitized = sanitized.replace(/\\n/g, '\n');

    // 3. Ensure it looks like a PEM key (basic check)
    if (!sanitized.includes('-----BEGIN PRIVATE KEY-----')) {
        console.warn('Warning: Google Private Key does not look like a standard PEM key.');
    }

    return sanitized;
}

// Apply sanitization
GOOGLE_PRIVATE_KEY = sanitizePrivateKey(GOOGLE_PRIVATE_KEY);

if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.error('CRITICAL: Google Sheets credentials missing.');
} else {
    // Debug log for key format (safe - showing start/end only)
    const keyLen = GOOGLE_PRIVATE_KEY.length;
    const keyPreview = keyLen > 50
        ? `${GOOGLE_PRIVATE_KEY.substring(0, 25)}...${GOOGLE_PRIVATE_KEY.substring(keyLen - 25)}`
        : '(Too short)';

    console.log('Google Service Account Init:', {
        email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        keyLength: keyLen,
        keyPreview: JSON.stringify(keyPreview) // Stringify allows seeing if \n are actual newlines or escaped
    });
}

// Use JWT Client explicitly
const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function fetchSheetData(range: string) {
    try {
        await auth.authorize(); // Explicit check
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range,
        });

        return response.data.values || [];
    } catch (error: any) {
        console.error('Error fetching sheet data:', error.message);
        if (error.response) {
            console.error('API Error Details:', error.response.data);
        }
        // Helpful error for the user
        let msg = error.message;
        if (msg.includes('DECODER routines::unsupported') || msg.includes('routines:OPENSSL_internal:BAD_END_LINE')) {
            msg += ' (Private Key formatı hatalı. .env dosyasındaki anahtarın "\\n" karakterlerini ve tırnak işaretlerini kontrol edin.)';
        }
        throw new Error(`Google Sheets Hatası: ${msg}`);
    }
}
