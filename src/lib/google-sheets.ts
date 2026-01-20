
import { google } from 'googleapis';

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

// Robust Private Key Sanitization
function sanitizePrivateKey(key: string | undefined): string | undefined {
    if (!key) return undefined;

    let sanitized = key;

    // 1. Recursively remove surrounding quotes (double or single)
    while (
        (sanitized.startsWith('"') && sanitized.endsWith('"')) ||
        (sanitized.startsWith("'") && sanitized.endsWith("'"))
    ) {
        sanitized = sanitized.slice(1, -1);
    }

    // 2. Handle escaped newlines
    sanitized = sanitized.replace(/\\n/g, '\n');

    return sanitized;
}

// Apply sanitization
GOOGLE_PRIVATE_KEY = sanitizePrivateKey(GOOGLE_PRIVATE_KEY);

// Use JWT Client explicitly
const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function fetchSheetData(range: string) {
    if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        throw new Error('Google Sheets credentials missing in environment variables.');
    }

    try {
        await auth.authorize(); // Explicit check
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range,
        });

        return response.data.values || [];
    } catch (error: any) {
        console.error('Error fetching sheet data:', error.message);

        let msg = error.message;

        // Detailed Debug Info attached to the error for UI diagnosis
        if (msg.includes('DECODER routines::unsupported') || msg.includes('bad decrypt') || msg.includes('routines:OPENSSL_internal')) {
            const keyLen = GOOGLE_PRIVATE_KEY ? GOOGLE_PRIVATE_KEY.length : 0;
            const hasHeader = GOOGLE_PRIVATE_KEY?.includes('-----BEGIN PRIVATE KEY-----');
            const hasFooter = GOOGLE_PRIVATE_KEY?.includes('-----END PRIVATE KEY-----');
            const newlineCount = (GOOGLE_PRIVATE_KEY?.match(/\n/g) || []).length;

            msg = `Private Key Hatası! Detaylar: Uzunluk=${keyLen}, Header=${hasHeader}, Footer=${hasFooter}, SatırSayısı=${newlineCount}. (Orijinal: ${error.message})`;
        }

        throw new Error(msg);
    }
}
