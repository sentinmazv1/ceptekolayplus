
import { google } from 'googleapis';

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

// Sanitize the key
if (GOOGLE_PRIVATE_KEY) {
    // 1. Unescape newlines if strictly escaped (\n)
    GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    // 2. Remove surrounding double quotes if accidentally included in the value
    if (GOOGLE_PRIVATE_KEY.startsWith('"') && GOOGLE_PRIVATE_KEY.endsWith('"')) {
        GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY.slice(1, -1);
    }
}

if (!GOOGLE_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    console.error('CRITICAL: Google Sheets credentials missing.');
} else {
    // Debug log for key format (safe)
    const keySample = GOOGLE_PRIVATE_KEY.substring(0, 20) + '...' + GOOGLE_PRIVATE_KEY.substring(GOOGLE_PRIVATE_KEY.length - 20);
    console.log('Google Service Account Init:', {
        email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        keySample: JSON.stringify(keySample)
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
        throw new Error(`Google Sheets Hatası: ${error.message} (Key Formatını Kontrol Edin)`);
    }
}
