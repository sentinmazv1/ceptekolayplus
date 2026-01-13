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
    'email',
    'ilce', // Just in case it was there? No, target is below.
    // Padding to reach Column CD (Index 81)
    // Current last was email at 57.
    // We need 58..80 to be fillers. 
    // 81 will be ilce.
    // 81 will be ilce.
    'satilan_urunler', 'SKIP_BH', 'SKIP_BI', 'SKIP_BJ', 'SKIP_BK', 'SKIP_BL', 'SKIP_BM', 'SKIP_BN', 'SKIP_BO', 'SKIP_BP',
    'SKIP_BQ', 'SKIP_BR', 'SKIP_BS', 'SKIP_BT', 'SKIP_BU', 'SKIP_BV', 'SKIP_BW', 'SKIP_BX', 'SKIP_BY', 'SKIP_BZ',
    'SKIP_CA', 'SKIP_CB', 'SKIP_CC',
    'ilce', // Column CD (Index 81)
    // Padding to reach Column DM (Index 116)
    // We need 116 - 81 = 35 more skips? No.
    // Current 'ilce' is 81.
    // We need indices 82..115 to be skips.
    // Target 'iptal_nedeni' is at 116.
    'SKIP_CE', 'SKIP_CF', 'SKIP_CG', 'SKIP_CH', 'SKIP_CI', 'SKIP_CJ', 'SKIP_CK', 'SKIP_CL', 'SKIP_CM', 'SKIP_CN',
    'SKIP_CO', 'SKIP_CP', 'SKIP_CQ', 'SKIP_CR', 'SKIP_CS', 'SKIP_CT', 'SKIP_CU', 'SKIP_CV', 'SKIP_CW', 'SKIP_CX',
    'SKIP_CY', 'SKIP_CZ',
    'SKIP_DA', 'SKIP_DB', 'SKIP_DC', 'SKIP_DD', 'SKIP_DE', 'SKIP_DF', 'SKIP_DG', 'SKIP_DH', 'SKIP_DI', 'SKIP_DJ',
    'SKIP_DK', 'SKIP_DL',
    'iptal_nedeni' // Column DM (Index 116)
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

import { parse, isValid } from 'date-fns';

export function parseSheetDate(dateStr: string | undefined): number | null {
    if (!dateStr || !dateStr.trim()) return null;
    const cleanStr = dateStr.trim();

    // 1. Try standard JS Date (ISO 8601, etc.)
    const d = new Date(cleanStr);
    if (!isNaN(d.getTime())) return d.getTime();

    // 2. Try strict formats with date-fns
    const formats = [
        'dd.MM.yyyy HH:mm:ss',
        'dd.MM.yyyy HH:mm',
        'dd.MM.yyyy',
        'dd/MM/yyyy HH:mm:ss',
        'dd/MM/yyyy HH:mm',
        'dd/MM/yyyy',
        'dd-MM-yyyy HH:mm:ss',
        'dd-MM-yyyy HH:mm',
        'dd-MM-yyyy',
        'yyyy-MM-dd HH:mm:ss',
        'yyyy-MM-dd'
    ];

    const now = new Date();
    for (const fmt of formats) {
        const parsed = parse(cleanStr, fmt, now);
        if (isValid(parsed)) return parsed.getTime();
    }

    console.warn(`[parseSheetDate] Failed to parse: "${cleanStr}"`);
    return null;
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

            // 1. New (or Empty/Automation)
            if (c.durum === 'Yeni' || !c.durum || c.durum.trim() === '') return true;

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

export async function lockNextLead(userEmail: string): Promise<(Customer & { source?: string }) | null> {
    const client = getSheetsClient();

    // OPTIMISTIC LOCKING with Retry
    // We try up to 3 times to lock a lead.
    for (let attempt = 0; attempt < 3; attempt++) {
        // 1. Fetch Candidates (Refetched on each attempt to get fresh status)
        const response = await client.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `Customers!A:ZZ`,
        });

        const rows = response.data.values || [];
        if (rows.length < 2) return null;

        const candidates = rows
            .map((row, index) => ({ customer: rowToCustomer(row), rowIndex: index + 1 }))
            .filter(item => {
                if (item.rowIndex <= 1) return false;
                const c = item.customer;
                // Skip locked or owned
                if (c.kilitli_mi === true || (c.kilitli_mi as any) === 'TRUE' || c.sahip) return false;

                // Priority Logic
                const nowTime = new Date().getTime();
                const TWO_HOURS = 2 * 60 * 60 * 1000;

                if (c.durum === 'Daha sonra aranmak istiyor' && c.sonraki_arama_zamani) {
                    const t = parseSheetDate(c.sonraki_arama_zamani);
                    if (t && t <= nowTime) return true;
                }

                // Allow 'Yeni' AND Empty status (Automation Leads)
                if (c.durum === 'Yeni' || !c.durum || c.durum.trim() === '') return true;

                if (c.durum === 'Ulaşılamadı' || c.durum === 'Meşgul/Hattı kapalı' || c.durum === 'Cevap Yok') {
                    if (!c.son_arama_zamani) return true;
                    return (nowTime - new Date(c.son_arama_zamani).getTime()) > TWO_HOURS;
                }
                return false;
            })
            .sort((a, b) => {
                const getScore = (c: Customer) => {
                    // Priority 1: Automation/Empty Status (Hot Leads from SendPulse)
                    // User Request: "önce durumu boş olanlar bunlar instagramdan gelen"
                    if (!c.durum || c.durum.trim() === '') return 1;

                    // Priority 2: Scheduled (Randevu)
                    // User Request: "sonra randevu"
                    if (c.durum === 'Daha sonra aranmak istiyor') return 2;

                    // Priority 3: Standard New
                    // User Request: "sonra yeni"
                    if (c.durum === 'Yeni') return 3;

                    // Priority 4: Retry
                    return 4;
                };
                const sA = getScore(a.customer);
                const sB = getScore(b.customer);
                if (sA !== sB) return sA - sB;
                return a.rowIndex - b.rowIndex;
            });

        if (candidates.length === 0) return null;

        const target = candidates[0];
        const rowIndex = target.rowIndex;

        // 2. Attempt to Lock
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
        const newRow = customerToRow(newCustomerData);

        await client.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `Customers!A${rowIndex}:${LAST_COL}${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [newRow] }
        });

        // 3. VERIFICATION (Race Condition Check)
        // Wait a small random amount to allow collision resolution (last write wins)
        const delay = Math.floor(Math.random() * 500) + 200; // 200-700ms
        await new Promise(r => setTimeout(r, delay));

        // Read specific row back
        const verifyRes = await client.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `Customers!A${rowIndex}:${LAST_COL}${rowIndex}`,
        });
        const verifyRow = verifyRes.data.values?.[0];

        if (verifyRow) {
            const currentOwner = verifyRow[COL_SAHIP];
            // If I am the owner, success!
            if (currentOwner === userEmail) {
                // Determine Source for User Feedback
                let source = 'Genel';
                if (target.customer.durum === 'Daha sonra aranmak istiyor') source = '📅 Randevu';
                else if (target.customer.durum === 'Yeni') source = '🆕 Yeni Kayıt';
                else if (!target.customer.durum || target.customer.durum.trim() === '') source = '🤖 Otomasyon';
                else source = '♻️ Tekrar Arama';

                const finalCustomer: Customer & { source: string } = {
                    ...newCustomerData,
                    durum: 'Aranacak',
                    source: source
                };

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
            } else {
                console.warn(`Race condition lost. Target ${rowIndex} owned by ${currentOwner}, expected ${userEmail}. Retrying...`);
                // Loop continues to next attempt
            }
        }
    }

    return null; // Failed after retries
}

// import { formatInTimeZone } from 'date-fns-tz';

export async function getLeadStats(user?: { email: string; role: string }) {
    const client = getSheetsClient();
    // Fetch A2:ZZ but impose a SAFETY LIMIT for Vercel
    // Even A2:ZZ dynamic might be too huge if there are 5000+ rows
    // We will fetch up to ROW 3500 as a temporary fix to ensure stability
    const response = await client.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `Customers!A2:ZZ`, // Removed hardcoded limit to match Reports logic
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
    const hourly: Record<number, number> = {}; // 0-23

    // Determine if we should filter for this user
    const isSales_REP = user?.role === 'SALES_REP';
    const filterEmail = user?.email;

    // Loop through RAW rows for max speed
    for (const row of rows) {
        // Direct access
        const durum = row[COL_DURUM];
        const onay_durumu = row[COL_ONAY_DURUMU];
        const son_arama = row[COL_SON_ARAMA];
        const sonraki_arama = row[COL_SONRAKI_ARAMA];
        const kilitli_mi = row[COL_KILITLI];
        const sahip = row[COL_SAHIP];

        // 1. GLOBAL Availability Calculation (Same for everyone)
        // Skip locked/owned for availability check
        const isLockedOrOwned = (kilitli_mi === 'TRUE' || kilitli_mi === true || (sahip && sahip.length > 0));

        let isAvailable = false;
        if (!isLockedOrOwned) {
            if (durum === 'Daha sonra aranmak istiyor') {
                if (sonraki_arama) {
                    const scheduleTime = parseSheetDate(sonraki_arama);
                    if (scheduleTime && scheduleTime <= nowTime) {
                        isAvailable = true;
                    }
                }
            } else if (durum === 'Yeni' || !durum || durum.trim() === '') {
                // Include Empty/Automation leads in pool count
                isAvailable = true;
                waiting_new++;
            } else if (durum === 'Ulaşılamadı' || durum === 'Meşgul/Hattı kapalı' || durum === 'Cevap Yok') {
                // Retry logic
                if (!son_arama) {
                    // isAvailable = true; 
                } else {
                    const lastCall = new Date(son_arama).getTime();
                    if (nowTime - lastCall > TWO_HOURS) {
                        isAvailable = true;
                    }
                }
            }
        }
        if (isAvailable) available++;


        // 2. OWNERSHIP Filter for Detailed Stats
        let isMine = true;
        if (isSales_REP && filterEmail) {
            isMine = (sahip === filterEmail);
        }

        if (!isMine) continue; // SKIP detailed stats for others

        // --- DETAILED STATS (Only for owned or Admin) ---

        // Status Counts
        if (durum) {
            statusCounts[durum] = (statusCounts[durum] || 0) + 1;
        }

        // Today Called & Hourly Stats
        if (son_arama) {
            let lastCallDate = '';
            const ts = parseSheetDate(son_arama);

            if (ts) {
                const d = new Date(ts);
                lastCallDate = trFormatter.format(d);

                // Hourly Stat
                const hourStr = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'Europe/Istanbul',
                    hour: 'numeric',
                    hour12: false
                }).format(new Date(ts));

                const h = parseInt(hourStr, 10);
                if (!isNaN(h)) {
                    hourly[h] = (hourly[h] || 0) + 1;
                }
            }

            if (lastCallDate === todayStr) {
                today_called++;
            }
        }

        // Pending Apporval logic 
        const isPending = durum === 'Başvuru alındı';
        if (isPending) pending_approval++;

        // Strict check as per user request (only 'durum' matters)
        const d = durum?.trim().toLocaleLowerCase('tr-TR') || '';
        if (d === 'kefil bekleniyor') waiting_guarantor++;
        if (durum === 'Teslim edildi') delivered++;
        if (durum === 'Onaylandı') approved++;

        // Detailed Counters matching original logic (but filtered by mine)
        if (durum === 'Daha sonra aranmak istiyor') {
            if (sonraki_arama) {
                const scheduleTime = parseSheetDate(sonraki_arama);
                if (scheduleTime && scheduleTime <= nowTime) {
                    waiting_scheduled++;
                }
            }
        } else if (durum === 'Ulaşılamadı' || durum === 'Meşgul/Hattı kapalı' || durum === 'Cevap Yok') {
            if (!son_arama) {
                waiting_retry++;
            } else {
                const lastCall = new Date(son_arama).getTime();
                if (nowTime - lastCall > TWO_HOURS) {
                    waiting_retry++;
                }
            }
        }
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
        statusCounts,
        hourly
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

    // LOGIC UPDATE: Only release ownership for 'Yanlış numara' or explicit pool return.
    // 'Ulaşılamadı', 'Meşgul', 'Cevap Yok', 'Kefil bekleniyor' should remain OWNED by the Rep 
    // so they can see them in their stats and retry list.
    const releaseStatuses = [
        'Yanlış numara',
        // 'Uygun değil', // Maybe keep this? Usually implies drop. Let's keep 'Uygun değil' as release if it's a hard reject.
        'Uygun değil'
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

export async function getLogs(customerId?: string): Promise<LogEntry[]> {
    const client = getSheetsClient();
    const response = await client.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Logs!A2:H',
    });

    const rows = response.data.values || [];
    let logs = rows
        .map(row => ({
            log_id: row[0],
            timestamp: row[1],
            user_email: row[2],
            customer_id: row[3],
            action: row[4] as LogEntry['action'],
            old_value: row[5],
            new_value: row[6],
            note: row[7]
        }));

    if (customerId) {
        logs = logs.filter(log => log.customer_id === customerId);
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getRecentLogs(limit: number = 50): Promise<LogEntry[]> {
    const client = getSheetsClient();
    // Optimization: In a real app, we would find the last row and only fetch the last N rows.
    // For now, fetching all logs and slicing is acceptable for < 5000 logs.
    const response = await client.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Logs!A2:H',
    });

    const rows = response.data.values || [];
    const logs = rows.map(row => ({
        log_id: row[0],
        timestamp: row[1],
        user_email: row[2],
        customer_id: row[3],
        action: row[4] as LogEntry['action'],
        old_value: row[5],
        new_value: row[6],
        note: row[7]
    }))
        .filter(log => log.user_email && log.user_email !== 'system' && log.user_email !== 'System' && log.user_email !== 'Sistem') // Filter out system noise
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

    return logs;
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
