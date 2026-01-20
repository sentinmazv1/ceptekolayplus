
import { google } from 'googleapis';

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

// Robust Private Key Sanitization & Repair
function sanitizePrivateKey(key: string | undefined): string | undefined {
    if (!key) return undefined;

    let sanitized = key.trim();
    while (
        (sanitized.startsWith('"') && sanitized.endsWith('"')) ||
        (sanitized.startsWith("'") && sanitized.endsWith("'"))
    ) {
        sanitized = sanitized.slice(1, -1);
    }
    sanitized = sanitized.replace(/\\n/g, '\n');

    if (!sanitized.includes('-----BEGIN PRIVATE KEY-----')) {
        const content = sanitized.trim();
        sanitized = `-----BEGIN PRIVATE KEY-----\n${content}`;
    }

    if (!sanitized.includes('-----END PRIVATE KEY-----')) {
        if (!sanitized.endsWith('\n')) sanitized += '\n';
        sanitized += '-----END PRIVATE KEY-----\n';
    }
    return sanitized;
}

GOOGLE_PRIVATE_KEY = sanitizePrivateKey(GOOGLE_PRIVATE_KEY);

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
        await auth.authorize();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range,
        });
        return response.data.values || [];
    } catch (error: any) {
        console.error('Error fetching sheet data:', error.message);

        let msg = error.message;

        // 1. Private Key Errors
        if (msg.includes('DECODER routines::unsupported') || msg.includes('bad decrypt') || msg.includes('routines:OPENSSL_internal')) {
            const keyLen = GOOGLE_PRIVATE_KEY ? GOOGLE_PRIVATE_KEY.length : 0;
            const newlineCount = (GOOGLE_PRIVATE_KEY?.match(/\n/g) || []).length;
            msg = `Private Key Hatası! (Uzunluk=${keyLen}, Satır=${newlineCount}). (Orijinal: ${error.message})`;
        }

        // 2. Permission / Not Found Errors (404)
        else if (msg.includes('Requested entity was not found') || error.code === 404) {
            // Show the first and last few chars of the ID for verification
            const idPreview = GOOGLE_SHEET_ID ? `${GOOGLE_SHEET_ID.substring(0, 5)}...${GOOGLE_SHEET_ID.substring(GOOGLE_SHEET_ID.length - 5)}` : 'BİLİNMİYOR';
            msg = `E-Tablo Bulunamadı! Sistemdeki ID: "${idPreview}". Lütfen Vercel'deki GOOGLE_SHEET_ID ile tarayıcınızdaki ID'yi karşılaştırın. Ayrıca "${GOOGLE_SERVICE_ACCOUNT_EMAIL}" adresinin yetkili olduğundan emin olun.`;
        }

        throw new Error(msg);
    }
}
