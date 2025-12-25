import { getSheetsClient } from './google';
import { Customer, LeadStatus, LogEntry } from './types';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Column Mapping Helper (0-indexed)
// CRITICAL: This order MUST match Google Sheets column order exactly
export const COLUMNS = [
    // Core Identity & Contact (0-9)
    'id', 'created_at', 'created_by', 'ad_soyad', 'telefon', 'tc_kimlik', 'dogum_tarihi', 'sehir', 'meslek_is', 'mulkiyet_durumu',
    // Status & Tracking (10-16)
    'durum', 'sahip', 'cekilme_zamani', 'son_arama_zamani', 'sonraki_arama_zamani', 'arama_not_kisa', 'aciklama_uzun',
    // Documents & Employment (17-21)
    'e_devlet_sifre', 'ikametgah_varmi', 'hizmet_dokumu_varmi', 'ayni_isyerinde_sure_ay', 'son_yatan_maas',
    // Legal & Assets (22-30)
    'dava_dosyasi_varmi', 'acik_icra_varmi', 'kapali_icra_varmi', 'kapali_icra_kapanis_sekli', 'gizli_dosya_varmi',
    'arac_varmi', 'tapu_varmi', 'avukat_sorgu_durumu', 'avukat_sorgu_sonuc',
    // Media (31-32)
    // Media (31-32)
    'gorsel_1_url', 'gorsel_2_url',

    // System Metadata (Original 33-34) - DEPRECATED (Moved to AU/AV)
    'deprecated_updated_at', 'deprecated_updated_by',

    // Lock System (Original 35-37)
    'kilitli_mi', 'kilit_sahibi', 'kilit_zamani',

    // Application (Original 38-40)
    'basvuru_kanali', 'talep_edilen_urun', 'talep_edilen_tutar',

    // Old Status Fields (Original 41-42) - DEPRECATED (Moved to AR/AS)
    'deprecated_onay_durumu', 'deprecated_kredi_limiti',

    // NEW MAPPING STARTING AT AR (43)
    'onay_durumu',      // AR (43)
    'kredi_limiti',     // AS (44)
    'admin_notu',       // AT (45)
    'updated_at',       // AU (46)
    'updated_by',       // AV (47)
    'urun_seri_no',     // AW (48)
    'urun_imei',        // AX (49)

    // Filler/Shifted Fields (Need to check where these land vs data)
    'onay_tarihi', 'onaylayan_admin', 'teslim_tarihi', 'teslim_eden',

    // Detail Fields
    'arac_detay', 'tapu_detay', 'dava_detay', 'gizli_dosya_detay', 'acik_icra_detay',
    // Guarantor (Kefil) (55-67)
    'kefil_ad_soyad', 'kefil_telefon', 'kefil_tc_kimlik', 'kefil_meslek_is', 'kefil_son_yatan_maas',
    'kefil_ayni_isyerinde_sure_ay', 'kefil_e_devlet_sifre', 'kefil_ikametgah_varmi', 'kefil_hizmet_dokumu_varmi',
    'kefil_dava_dosyasi_varmi', 'kefil_dava_detay', 'kefil_acik_icra_varmi', 'kefil_acik_icra_detay',
    'kefil_kapali_icra_varmi', 'kefil_kapali_icra_kapanis_sekli', 'kefil_mulkiyet_durumu',
    'kefil_arac_varmi', 'kefil_tapu_varmi', 'kefil_notlar',
    'winner_musteri_no',
    'psikoteknik_varmi',
    'psikoteknik_notu',
    'email'
] as const;
// Total: 72 columns

const COL_INDEX = COLUMNS.reduce((acc, col, idx) => ({ ...acc, [col]: idx }), {} as Record<string, number>);

// Helper to get column letter from index (0-indexed)
function getColLetter(index: number): string {
    let letter = '';
    while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
    }
    return letter;
}

const LAST_COL = getColLetter(COLUMNS.length - 1); // e.g., "AU" for 47 columns

// Column Indices for Fast Access (Direct index access is faster than map lookup in loop)
const COL_DURUM = COL_INDEX['durum'];
const COL_ONAY_DURUMU = COL_INDEX['onay_durumu'];
const COL_SON_ARAMA = COL_INDEX['son_arama_zamani'];
const COL_SONRAKI_ARAMA = COL_INDEX['sonraki_arama_zamani'];
const COL_KILITLI = COL_INDEX['kilitli_mi'];
const COL_SAHIP = COL_INDEX['sahip'];



function rowToCustomer(row: any[]): Customer {
    const c: any = {};
    COLUMNS.forEach((col, idx) => {
        c[col] = row[idx] || undefined;
    });

    // Auto-generate ID if missing
    if (!c.id) {
        c.id = crypto.randomUUID();
        console.warn('Generated missing ID for customer:', c.ad_soyad || 'Unknown');
    }

    return c as Customer;
}

function customerToRow(c: Partial<Customer>): any[] {
    const row = new Array(COLUMNS.length).fill('');
    COLUMNS.forEach((col, idx) => {
        if (c[col as keyof Customer] !== undefined) {
            row[idx] = c[col as keyof Customer];
        }
    });
    return row;
}

export async function getLeads(filters?: { sahip?: string; durum?: LeadStatus }) {
    const client = getSheetsClient();
    const response = await client.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `Customers!A2:ZZ`, // Dynamic range, no 5000 limit - fixes timeout
    });

    const rows = response.data.values || [];

    // Auto-fix missing IDs
    const updates: { range: string; values: string[][] }[] = [];

    const customers = rows.map((row, index) => {
        // ID is always the first column (index 0)
        if (!row[0]) {
            const newId = crypto.randomUUID();
            row[0] = newId; // Update in memory

            // Queue update for Google Sheets
            const rowIndex = index + 2; // +1 header, +1 0-index
            updates.push({
                range: `Customers!A${rowIndex}`, // Column A is ID
                values: [[newId]]
            });
            console.log(`Auto-assigning ID ${newId} to row ${rowIndex}`);
        }
        return rowToCustomer(row);
    });

    // Execute batch update if any IDs were missing
    if (updates.length > 0) {
        try {
            console.log(`Saving ${updates.length} new IDs to Google Sheets...`);
            await client.spreadsheets.values.batchUpdate({
                spreadsheetId: SHEET_ID,
                requestBody: {
                    valueInputOption: 'USER_ENTERED',
                    data: updates
                }
            });
            console.log('Successfully saved missing IDs.');
        } catch (error) {
            console.error('Failed to auto-save IDs:', error);
        }
    }

    let filtered = customers;

    if (filters?.sahip) {
        filtered = filtered.filter(c => c.sahip === filters.sahip);
    }
    if (filters?.durum) {
        filtered = filtered.filter(c => c.durum === filters.durum);
    }

    return filtered;
}

export async function getCustomersByStatus(status: string, user: { email: string; role: string }) {
    const client = getSheetsClient();
    const response = await client.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `Customers!A2:ZZ`, // Dynamic range
    });

    const rows = response.data.values || [];
    const customers = rows.map(row => rowToCustomer(row));

    // Filter by status
    let filtered: Customer[] = [];

    if (status === 'HAVUZ') {
        const nowTime = new Date().getTime();
        const TWO_HOURS = 2 * 60 * 60 * 1000;

        filtered = customers.filter(c => {
            // Must not be locked or owned
            if (c.kilitli_mi || (c.sahip && c.sahip.length > 0)) return false;

            // 1. New
            if (c.durum === 'Yeni') return true;

            // 2. Scheduled
            if (c.durum === 'Daha sonra aranmak istiyor') {
                if (c.sonraki_arama_zamani) {
                    const scheduleTime = new Date(c.sonraki_arama_zamani).getTime();
                    return scheduleTime <= nowTime;
                }
                return false;
            }

            // 3. Retry
            if (c.durum === 'Ulaşılamadı' || c.durum === 'Meşgul/Hattı kapalı' || c.durum === 'Cevap Yok') {
                if (!c.son_arama_zamani) return true;
                const lastCall = new Date(c.son_arama_zamani).getTime();
                return (nowTime - lastCall) > TWO_HOURS;
            }

            return false;
        });
    } else {
        // Standard Status Filter
        filtered = customers.filter(c => c.durum === status);
    }

    // Role-based filtering: Sales reps only see their own customers
    if (user.role === 'SALES_REP') {
        filtered = filtered.filter(c => c.sahip === user.email);
    }

    // Sort by most recent first
    filtered.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
    });

    return filtered;
}

export async function lockNextLead(userEmail: string): Promise<Customer | null> {
    const client = getSheetsClient();

    // 1. Fetch all leads to find the best candidate
    // OPTIMIZATION: In a real app with 10k+ rows, we'd cache or query differently.
    // For <1000 active leads, fetching all is fine.
    const response = await client.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `Customers!A:ZZ`,
    });

    const rows = response.data.values || [];
    if (rows.length < 2) return null; // Only header

    // Find candidates
    // Priority 1: Scheduled Calls (Sonra Aranacak & Time passed)
    // Priority 2: New Leads (Yeni)
    // Priority 3: Retry (Ulaşılamadı/Meşgul & >2 hours since last call)

    const nowTime = new Date().getTime();
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    const candidates = rows
        .map((row, index) => ({ customer: rowToCustomer(row), rowIndex: index + 1 }))
        .filter(item => {
            if (item.rowIndex <= 1) return false; // Skip header
            const c = item.customer;

            // Skip locked or owned leads
            if (c.kilitli_mi === true || (c.kilitli_mi as any) === 'TRUE' || c.sahip) return false;

            // 1. Scheduled
            if (c.durum === 'Daha sonra aranmak istiyor' && c.sonraki_arama_zamani) {
                const scheduleTime = new Date(c.sonraki_arama_zamani).getTime();
                if (scheduleTime <= nowTime) return true;
            }

            // 2. New
            if (c.durum === 'Yeni') return true;

            // 3. Retry Logic REMOVED per user request (Phase 64)
            // Unreachable leads must be worked manually from the specific list.

            return false;

            return false;
        })
        .sort((a, b) => {
            // Sort by Priority logic
            const getScore = (c: Customer) => {
                if (c.durum === 'Daha sonra aranmak istiyor') return 1; // Highest
                if (c.durum === 'Yeni') return 2;
                return 3;
            };

            const scoreA = getScore(a.customer);
            const scoreB = getScore(b.customer);

            if (scoreA !== scoreB) return scoreA - scoreB;

            // If same priority, FIFO (rowIndex or created_at)
            return a.rowIndex - b.rowIndex;
        });

    if (candidates.length === 0) return null;

    const target = candidates[0];
    const rowIndex = target.rowIndex;

    // 2. Lock and Assign
    const now = new Date().toISOString();

    const updates = [
        { col: 'durum', val: 'Aranacak' },
        { col: 'sahip', val: userEmail },
        { col: 'cekilme_zamani', val: now },
        { col: 'kilitli_mi', val: 'TRUE' },
        { col: 'kilit_sahibi', val: userEmail },
        { col: 'kilit_zamani', val: now },
        { col: 'updated_at', val: now },
        { col: 'updated_by', val: userEmail }
    ];

    const newCustomerData = { ...target.customer, ...Object.fromEntries(updates.map(u => [u.col, u.val])) };

    // Explicitly set types for Customer properties that might be undefined
    const finalCustomer: Customer = {
        ...newCustomerData,
        durum: 'Aranacak', // Ensure strict literal type
        // ... other fields kept as is
    };

    const newRow = customerToRow(finalCustomer);

    await client.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Customers!A${rowIndex}:${LAST_COL}${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [newRow]
        }
    });

    // Log it
    await logAction({
        log_id: crypto.randomUUID(),
        timestamp: now,
        user_email: userEmail,
        customer_id: target.customer.id,
        action: 'PULL_LEAD',
        old_value: target.customer.durum,
        new_value: 'Aranacak'
    });

    return finalCustomer;
}

// import { formatInTimeZone } from 'date-fns-tz';

export async function getLeadStats() {
    const client = getSheetsClient();
    // Fetch A2:ZZ but impose a SAFETY LIMIT for Vercel
    // Even A2:ZZ dynamic might be too huge if there are 5000+ rows
    // We will fetch up to ROW 3500 as a temporary fix to ensure stability
    const response = await client.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `Customers!A2:ZZ3500`, // Explicit safety limit for stability
    });

    const rows = response.data.values || [];
    console.log(`[DEBUG] getLeadStats: Fetched ${rows.length} rows.`);
    console.log(`[DEBUG] COL_DURUM index: ${COL_DURUM}`);

    if (rows.length > 0) {
        console.log(`[DEBUG] First row sample:`, rows[0]);
        console.log(`[DEBUG] First row durum (index ${COL_DURUM}):`, rows[0][COL_DURUM]);
    }

    const nowTime = new Date().getTime();
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    let available = 0;
    let waiting_new = 0;
    let waiting_scheduled = 0;
    let total_scheduled = 0;
    let waiting_retry = 0;
    let pending_approval = 0;
    let waiting_guarantor = 0;
    let delivered = 0;
    let approved = 0;

    let today_called = 0;

    const trFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const todayStr = trFormatter.format(new Date());

    const statusCounts: Record<string, number> = {};

    // Loop through RAW rows for max speed
    for (const row of rows) {
        // Direct access
        const durum = row[COL_DURUM];
        const onay_durumu = row[COL_ONAY_DURUMU];
        const son_arama = row[COL_SON_ARAMA];
        const sonraki_arama = row[COL_SONRAKI_ARAMA];
        const kilitli_mi = row[COL_KILITLI];
        const sahip = row[COL_SAHIP];

        // Status Counts
        if (durum) {
            statusCounts[durum] = (statusCounts[durum] || 0) + 1;
        }

        // Today Called
        if (son_arama) {
            let lastCallDate = '';
            // Fast date check
            if (son_arama.length === 10 && son_arama.includes('-')) {
                // assume yyyy-mm-dd check
                if (son_arama.startsWith(todayStr)) lastCallDate = todayStr;
            } else {
                // Fallback parsing
                const date = new Date(son_arama);
                if (!isNaN(date.getTime())) {
                    lastCallDate = trFormatter.format(date);
                }
            }

            if (lastCallDate === todayStr) {
                today_called++;
            }
        }

        // Pending Apporval logic (Simplified for consistency)
        // If status is 'Başvuru alındı', it shows in Admin Panel as Pending, regardless of previous 'onay_durumu'.
        const isPending = durum === 'Başvuru alındı';
        if (isPending) pending_approval++;

        if (onay_durumu === 'Kefil İstendi' || durum === 'Kefil bekleniyor') waiting_guarantor++;
        if (durum === 'Teslim edildi') delivered++;
        if (durum === 'Onaylandı') approved++;

        // Availability Logic
        // Skip locked/owned
        if (kilitli_mi === 'TRUE' || kilitli_mi === true || (sahip && sahip.length > 0)) continue;

        let isAvailable = false;

        // 1. Scheduled
        if (durum === 'Daha sonra aranmak istiyor') {
            if (sonraki_arama) {
                const scheduleTime = new Date(sonraki_arama).getTime();
                if (scheduleTime <= nowTime) {
                    waiting_scheduled++;
                    isAvailable = true;
                }
            }
        }
        // 2. New
        else if (durum === 'Yeni') {
            waiting_new++;
            isAvailable = true;
        }
        // 3. Retry - REMOVED from availability count (Phase 64)
        else if (durum === 'Ulaşılamadı' || durum === 'Meşgul/Hattı kapalı' || durum === 'Cevap Yok') {
            // We still count them for the DASHBOARD STATS (waiting_retry), 
            // but we do NOT set isAvailable = true.
            // Because "Available" means "Available for Auto-Pull".
            if (!son_arama) {
                waiting_retry++;
                // isAvailable = true; // REMOVED
            } else {
                const lastCall = new Date(son_arama).getTime();
                if (nowTime - lastCall > TWO_HOURS) {
                    waiting_retry++;
                    // isAvailable = true; // REMOVED
                } else {
                    // Even if not cooled down, we track them as waiting retry generally?
                    // Actually original logic only counted them if cooled down.
                    // Let's keep counting them as "waiting_retry" if satisfied, 
                    // but NOT add to 'available'.
                }
            }
            // Actually, to be consistent with "waiting_retry" usually meaning "Ready to call",
            // let's keep the logic for `waiting_retry` increment, but remove `isAvailable = true`.

            // Wait, looking at original code:
            /*
             if (!son_arama) {
                waiting_retry++;
                isAvailable = true;
            } ...
            */
            // So `waiting_retry` was effectively "Ready Retry".
            // We should probably still count them if they are ready, so the admin sees them,
            // but just don't make them `isAvailable`.
        }

        if (isAvailable) available++;
    }

    total_scheduled = statusCounts['Daha sonra aranmak istiyor'] || 0;

    return {
        available,
        waiting_new,
        waiting_scheduled,
        total_scheduled,
        waiting_retry,
        pending_approval,
        waiting_guarantor,
        delivered,
        approved, // Use the explicit counter, NOT statusCounts['Onaylandı']
        today_called,
        statusCounts
    };
}

export async function updateLead(customer: Customer, userEmail: string) {
    const client = getSheetsClient();

    // Find row index by ID
    // Inefficient but reliable for small datasets
    const allLeads = await getLeads();
    const index = allLeads.findIndex(c => c.id === customer.id);

    if (index === -1) throw new Error('Lead not found');

    const rowIndex = index + 2; // +1 for header, +1 for 0-index match

    const now = new Date().toISOString();

    // LOGIC UPDATE: Unreachable/Retry statuses should release ownership
    // so they go back to the pool (or secondary pool).
    const releaseStatuses = [
        'Ulaşılamadı',
        'Meşgul/Hattı kapalı',
        'Cevap Yok',
        'Yanlış numara',
        'Uygun değil',
        'Kefil bekleniyor'
    ];

    const shouldRelease = releaseStatuses.includes(customer.durum);

    const updatedCustomer = {
        ...customer,
        updated_at: now,
        updated_by: userEmail,
        // If releasing, clear owner and lock
        sahip: shouldRelease ? '' : (customer.sahip || userEmail),
        kilitli_mi: shouldRelease ? false : (customer.kilitli_mi !== undefined ? customer.kilitli_mi : true),
        // If releasing, ensure 'kilit_sahibi' is also cleared if needed, 
        // though our logic mainly uses 'sahip' for sales rep view.
        // Google Sheets stores boolean as TRUE/FALSE string often, handled by customerToRow.
    };

    // Explicitly set kilitli_mi to string for sheets if needed, but customerToRow handles types.
    // However, if we want to be safe for the "kilitli_mi" column which expects TRUE/FALSE string:
    // (customerToRow just puts the value in, so boolean is fine if Sheets interprets it, 
    // but our 'lockNextLead' uses string "TRUE". Let's be consistent if possible, 
    // but boolean false usually works as FALSE in sheets or empty.)
    // Let's rely on standard behavior.

    const newRow = customerToRow(updatedCustomer);

    await client.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Customers!A${rowIndex}:${LAST_COL}${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRow] }
    });

    return updatedCustomer;
}

export async function logAction(entry: LogEntry) {
    const client = getSheetsClient();
    const row = [
        entry.log_id,
        entry.timestamp,
        entry.user_email,
        entry.customer_id,
        entry.action,
        entry.old_value || '',
        entry.new_value || '',
        entry.note || ''
    ];

    await client.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Logs!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
    });
}

export async function deleteCustomer(id: string, userEmail: string) {
    const client = getSheetsClient();

    // Find row index by ID
    const allLeads = await getLeads();
    const index = allLeads.findIndex(c => c.id === id);

    if (index === -1) throw new Error('Lead not found');

    const rowIndex = index + 2; // +1 for header, +1 to match 1-based index

    // We actully want to DELETE the row, shifting up.
    // The previous implementation used batchUpdate for value updates.
    // here we need the 'deleteDimension' request.
    const requests = [
        {
            deleteDimension: {
                range: {
                    sheetId: parseInt(process.env.GOOGLE_SHEET_GID || '0'), // Default GID 0 for first sheet 'Customers'
                    dimension: 'ROWS',
                    startIndex: rowIndex - 1, // 0-based inclusive
                    endIndex: rowIndex        // 0-based exclusive
                }
            }
        }
    ];

    await client.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
            requests
        }
    });

    // Log it
    await logAction({
        log_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user_email: userEmail,
        customer_id: id,
        action: 'UPDATE_STATUS', // Using generic as we don't have DELETE action type yet
        old_value: 'Active',
        new_value: 'DELETED',
        note: `Deleted by Admin`
    });
}
