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
    // Additional Fields (74-76) (approx)
    'winner_musteri_no',
    'psikoteknik_varmi',
    'psikoteknik_notu'
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
        range: `Customers!A2:${LAST_COL}5000`, // Explicit row limit: up to row 5000
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
        range: `Customers!A2:${LAST_COL}5000`, // Explicit row limit
    });

    const rows = response.data.values || [];
    const customers = rows.map(row => rowToCustomer(row));

    // Filter by status
    let filtered = customers.filter(c => c.durum === status);

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
        range: `Customers!A:${LAST_COL}`,
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

            // 3. Retry
            const retryStatuses = ['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'];
            if (retryStatuses.includes(c.durum)) {
                if (!c.son_arama_zamani) return true; // Should have a time, but if not, retry
                const lastCall = new Date(c.son_arama_zamani).getTime();
                if (nowTime - lastCall > TWO_HOURS) return true;
            }

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

import { formatInTimeZone } from 'date-fns-tz';

export async function getLeadStats() {
    const client = getSheetsClient();
    const response = await client.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `Customers!A2:${LAST_COL}5000`, // Explicit row limit
    });

    const rows = response.data.values || [];
    const nowTime = new Date().getTime();
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    let available = 0;
    let waiting_new = 0;
    let waiting_scheduled = 0;
    let total_scheduled = 0; // NEW: For UI display
    let waiting_retry = 0;
    let pending_approval = 0;
    let waiting_guarantor = 0;
    let delivered = 0;

    let today_called = 0; // NEW
    const todayStr = formatInTimeZone(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd');

    // Status counts for all statuses
    const statusCounts: Record<string, number> = {};

    rows.forEach(row => {
        const c = rowToCustomer(row);

        // NEW: Today Called Calculation
        if (c.son_arama_zamani) {
            let lastCallDate = '';
            // Try standard Date parse
            const date = new Date(c.son_arama_zamani);
            if (!isNaN(date.getTime())) {
                lastCallDate = formatInTimeZone(date, 'Europe/Istanbul', 'yyyy-MM-dd');
            } else if (c.son_arama_zamani.includes('.')) {
                // Try Parsing DD.MM.YYYY
                const parts = c.son_arama_zamani.split('.');
                if (parts.length === 3) {
                    // yyyy-mm-dd format for comparison
                    // Check if valid date? 
                    // Let's rely on simple string compare if mapped correctly. 
                    // Actually formatInTimeZone expects a Date object.
                    const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    if (!isNaN(d.getTime())) {
                        lastCallDate = formatInTimeZone(d, 'Europe/Istanbul', 'yyyy-MM-dd');
                    }
                }
            }

            if (lastCallDate === todayStr) {
                today_called++;
            }
        }

        // Increment status count
        if (c.durum) {
            statusCounts[c.durum] = (statusCounts[c.durum] || 0) + 1;
        }

        // General Status Counts
        // Fix for "Pending Approval" logic:
        // Count if strictly "Beklemede" OR (Başvuru alındı AND not yet processed)
        const isPending = c.onay_durumu === 'Beklemede' || (c.durum === 'Başvuru alındı' && !c.onay_durumu);

        if (isPending) pending_approval++;
        if (c.onay_durumu === 'Kefil İstendi' || c.durum === 'Kefil bekleniyor') waiting_guarantor++;
        if (c.durum === 'Teslim edildi') delivered++;

        // Locked/Owned
        if (c.kilitli_mi === true || (c.kilitli_mi as any) === 'TRUE' || c.sahip) return;

        let isAvailable = false;

        // 1. Scheduled
        if (c.durum === 'Daha sonra aranmak istiyor') {
            total_scheduled++; // Count all scheduled, regardless of time

            if (c.sonraki_arama_zamani) {
                const scheduleTime = new Date(c.sonraki_arama_zamani).getTime();
                if (scheduleTime <= nowTime) {
                    waiting_scheduled++;
                    isAvailable = true;
                }
            }
        }
        // 2. New
        else if (c.durum === 'Yeni') {
            waiting_new++;
            isAvailable = true;
        }
        // 3. Retry
        else if (['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'].includes(c.durum)) {
            if (!c.son_arama_zamani) {
                waiting_retry++;
                isAvailable = true;
            } else {
                const lastCall = new Date(c.son_arama_zamani).getTime();
                if (nowTime - lastCall > TWO_HOURS) {
                    waiting_retry++;
                    isAvailable = true;
                }
            }
        }

        if (isAvailable) available++;
    });

    // Verify total_scheduled captures ALL scheduled leads regardless of ownership
    total_scheduled = statusCounts['Daha sonra aranmak istiyor'] || 0;

    return {
        available,
        waiting_new,
        waiting_scheduled,
        total_scheduled, // Return this
        waiting_retry,
        pending_approval,
        waiting_guarantor,
        delivered,
        approved: statusCounts['Onaylandı'] || 0,
        today_called, // NEW: Today called count
        statusCounts // All status counts
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
    const updatedCustomer = {
        ...customer,
        updated_at: now,
        updated_by: userEmail,
        // Release lock only if we want to? Requirement says "Pull" locks it. 
        // Usually lock is permanent ownership until status change?
        // "Immediately lock it atomically... Return the customer card UI."
        // So 'kilitli_mi' might just mean "Taken".
    };

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
