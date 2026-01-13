
import { supabaseAdmin } from './supabase';
import { Customer, LeadStatus, LogEntry } from './types';

// --- HELPERS ---

// Safe recursive fetch with safeguards
async function fetchAllLeads(queryBuilder: any): Promise<any[]> {
    let allRows: any[] = [];
    let page = 0;
    const pageSize = 1000;
    const MAX_PAGES = 10; // Safety brake (10k rows max for now)

    try {
        while (page < MAX_PAGES) {
            // Note: In supabase-js, .range() returns a new Promise-like builder. 
            // We assume queryBuilder is the base FilterBuilder.
            const { data, error } = await queryBuilder
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) {
                console.error('fetchAllLeads error on page', page, error);
                throw error;
            }
            if (!data || data.length === 0) break;

            allRows = allRows.concat(data);

            if (data.length < pageSize) break; // Finished
            page++;
        }
    } catch (err) {
        console.error('fetchAllLeads CRITICAL FAIL:', err);
        // Fallback: return what we have so far instead of blowing up?
        // Or rethrow? For stats, partial data is better than 500.
        return allRows;
    }
    return allRows;
}

// --- READ OPERATIONS ---

export async function getLead(id: string): Promise<Customer | null> {
    const { data } = await supabaseAdmin.from('leads').select('*').eq('id', id).single();
    if (!data) return null;
    return mapRowToCustomer(data);
}

export async function getLeads(filters?: { sahip?: string; durum?: LeadStatus }): Promise<Customer[]> {
    let query = supabaseAdmin
        .from('leads')
        .select('*');

    if (filters?.sahip) {
        query = query.eq('sahip_email', filters.sahip);
    }
    if (filters?.durum) {
        query = query.eq('durum', filters.durum);
    }

    // LIST VIEW: Cap at 1000 for speed, users can search for specific older ones.
    const { data, error } = await query.range(0, 1000);

    if (error) {
        console.error('Supabase getLeads error:', error);
        throw error;
    }
    return (data || []).map(mapRowToCustomer);
}

export async function getCustomersByStatus(status: string, user: { email: string; role: string }): Promise<Customer[]> {
    const query = supabaseAdmin.from('leads').select('*');

    if (user.role === 'SALES_REP' && status !== 'HAVUZ') {
        query.eq('sahip_email', user.email);
    }

    let leads: any[] = [];

    // Optimize: HAVUZ needs checks on unowned, so we might need more rows.
    // But loading 3000 rows for a list view is bad UX.
    // Ideally we should filter in DB.

    if (status === 'HAVUZ') {
        // DB Filter for HAVUZ candidates to avoid fetching 3000 rows
        // HAVUZ candidates are: (sahip_email IS NULL)
        // AND (durum IS New OR Scheduled OR Retry)
        // We can approximate this in DB to reduce fetch size.
        const { data, error } = await supabaseAdmin
            .from('leads')
            .select('*')
            .is('sahip_email', null) // Primary filter
            .range(0, 2000); // Fetch top 2000 candidates

        if (error) throw error;
        leads = data || [];

    } else {
        // Specific status -> Filter in DB is efficient
        query.eq('durum', status);
        const { data, error } = await query.range(0, 1000);
        if (error) throw error;
        leads = data || [];
    }

    let filtered = leads.map(mapRowToCustomer);

    // JS-side filtering for complex HAVUZ logic (Time checks etc)
    if (status === 'HAVUZ') {
        const nowTime = new Date().getTime();
        const TWO_HOURS = 2 * 60 * 60 * 1000;

        filtered = filtered.filter(c => {
            // Re-verify unowned
            if (c.sahip && c.sahip.length > 0) return false;

            // 1. New/Automation
            if (c.durum === 'Yeni' || !c.durum || c.durum.trim() === '') return true;

            // 2. Scheduled
            if (c.durum === 'Daha sonra aranmak istiyor') {
                if (c.sonraki_arama_zamani) {
                    return new Date(c.sonraki_arama_zamani).getTime() <= nowTime;
                }
                return false;
            }

            // 3. Retry
            const retryStatuses = ['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'];
            if (retryStatuses.includes(c.durum)) {
                if (!c.son_arama_zamani) return true;
                return (nowTime - new Date(c.son_arama_zamani).getTime()) > TWO_HOURS;
            }
            return false;
        });
    }

    filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return filtered;
}

export async function searchCustomers(query: string): Promise<Customer[]> {
    if (!query || query.length < 2) return [];

    const cleanQuery = query.replace(/\D/g, '');
    const isNumeric = cleanQuery.length > 5;

    let dbQuery = supabaseAdmin.from('leads').select('*');

    if (isNumeric) {
        dbQuery = dbQuery.or(`tc_kimlik.ilike.%${cleanQuery}%,telefon.ilike.%${cleanQuery}%`);
    } else {
        dbQuery = dbQuery.ilike('ad_soyad', `%${query}%`);
    }

    const { data, error } = await dbQuery.limit(50);
    if (error) return [];
    return (data || []).map(mapRowToCustomer);
}


// --- WRITE OPERATIONS ---

export async function updateLead(customer: Customer, userEmail: string): Promise<Customer> {
    const now = new Date().toISOString();

    const releaseStatuses = ['Yanlış numara', 'Uygun değil', 'İptal/Vazgeçti'];
    const shouldRelease = releaseStatuses.includes(customer.durum);

    const updates: any = {
        updated_at: now,
        ad_soyad: customer.ad_soyad,
        telefon: customer.telefon,
        tc_kimlik: customer.tc_kimlik,
        email: customer.email,
        durum: customer.durum,
        onay_durumu: customer.onay_durumu,

        sahip_email: shouldRelease ? null : (customer.sahip || userEmail),

        sehir: customer.sehir,
        ilce: customer.ilce,
        meslek_is: customer.meslek_is,
        maas_bilgisi: customer.son_yatan_maas,

        admin_notu: customer.admin_notu,
        arama_notu: customer.arama_not_kisa,

        basvuru_kanali: customer.basvuru_kanali,
        talep_edilen_urun: customer.talep_edilen_urun,
        talep_edilen_tutar: customer.talep_edilen_tutar,

        sonraki_arama_zamani: customer.sonraki_arama_zamani,
        son_arama_zamani: customer.son_arama_zamani,

        icra_durumu: {
            acik_icra: customer.acik_icra_varmi,
            kapali_icra: customer.kapali_icra_varmi,
            detay: customer.acik_icra_detay
        },
        dava_durumu: {
            varmi: customer.dava_dosyasi_varmi,
            detay: customer.dava_detay
        }
    };

    const { data, error } = await supabaseAdmin
        .from('leads')
        .update(updates)
        .eq('id', customer.id)
        .select()
        .single();

    if (error) throw error;
    return mapRowToCustomer(data);
}

export async function addLead(customer: Partial<Customer>, userEmail: string): Promise<Customer> {
    const dbRow = {
        ad_soyad: customer.ad_soyad,
        telefon: customer.telefon,
        tc_kimlik: customer.tc_kimlik,
        durum: customer.durum || 'Yeni',
        basvuru_kanali: 'Panel',
        sahip_email: userEmail,
        created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
        .from('leads')
        .insert(dbRow)
        .select()
        .single();

    if (error) throw error;
    return mapRowToCustomer(data);
}

export async function deleteCustomer(id: string, userEmail: string) {
    const { error } = await supabaseAdmin
        .from('leads')
        .delete()
        .eq('id', id);

    if (error) throw error;

    await logAction({
        log_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user_email: userEmail,
        customer_id: id,
        action: 'UPDATE_STATUS',
        old_value: 'Active',
        new_value: 'DELETED',
        note: `Deleted by ${userEmail}`
    });
}

// --- LOCK LOGIC ---

export async function lockNextLead(userEmail: string): Promise<(Customer & { source?: string }) | null> {
    const { data: candidates, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .is('sahip_email', null)
        .limit(100);

    if (error || !candidates) return null;

    const nowTime = new Date().getTime();
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    const filtered = candidates.filter(c => {
        if (c.durum === 'Daha sonra aranmak istiyor') {
            if (c.sonraki_arama_zamani) {
                return new Date(c.sonraki_arama_zamani).getTime() <= nowTime;
            }
            return false;
        }
        if (c.durum === 'Yeni' || !c.durum || c.durum.trim() === '') return true;

        const retryStatuses = ['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'];
        if (retryStatuses.includes(c.durum)) {
            if (!c.son_arama_zamani) return true;
            return (nowTime - new Date(c.son_arama_zamani).getTime()) > TWO_HOURS;
        }
        return false;
    });

    if (filtered.length === 0) return null;

    filtered.sort((a, b) => {
        const getScore = (c: any) => {
            if (!c.durum || c.durum.trim() === '') return 1;
            if (c.durum === 'Daha sonra aranmak istiyor') return 2;
            if (c.durum === 'Yeni') return 3;
            return 4;
        };
        return getScore(a) - getScore(b);
    });

    const target = filtered[0];

    const { data: locked, error: lockError } = await supabaseAdmin
        .from('leads')
        .update({
            sahip_email: userEmail,
            durum: 'Aranacak',
            updated_at: new Date().toISOString()
        })
        .eq('id', target.id)
        .is('sahip_email', null)
        .select()
        .single();

    if (lockError || !locked) return null;

    let source = 'Genel';
    if (target.durum === 'Daha sonra aranmak istiyor') source = '📅 Randevu';
    else if (target.durum === 'Yeni') source = '🆕 Yeni Kayıt';
    else if (!target.durum || target.durum.trim() === '') source = '🤖 Otomasyon';
    else source = '♻️ Tekrar Arama';

    await logAction({
        log_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user_email: userEmail,
        customer_id: locked.id,
        action: 'PULL_LEAD',
        old_value: target.durum,
        new_value: 'Aranacak'
    });

    return { ...mapRowToCustomer(locked), source };
}


// --- LOGGING ---

export async function logAction(entry: LogEntry) {
    await supabaseAdmin.from('activity_logs').insert({
        id: entry.log_id,
        user_email: entry.user_email,
        customer_id: entry.customer_id,
        action: entry.action,
        old_value: entry.old_value,
        new_value: entry.new_value,
        note: entry.note
    });
}

export async function getLogs(customerId?: string): Promise<LogEntry[]> {
    let query = supabaseAdmin.from('activity_logs').select('*');
    if (customerId) query = query.eq('customer_id', customerId);
    const { data } = await query.order('created_at', { ascending: false }).limit(200);
    return (data || []).map(row => ({
        log_id: row.id,
        timestamp: row.created_at,
        user_email: row.user_email,
        customer_id: row.customer_id,
        action: row.action,
        old_value: row.old_value,
        new_value: row.new_value,
        note: row.note
    }));
}

export async function getRecentLogs(limit: number = 50): Promise<LogEntry[]> {
    const { data } = await supabaseAdmin
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    return (data || []).map(row => ({
        log_id: row.id,
        timestamp: row.created_at,
        user_email: row.user_email,
        customer_id: row.customer_id,
        action: row.action,
        old_value: row.old_value,
        new_value: row.new_value,
        note: row.note
    }));
}


// --- STATS ---

export async function getLeadStats(user?: { email: string; role: string }) {
    // Optimized fetch with try-catch and loop limit
    const query = supabaseAdmin.from('leads').select('durum, sahip_email, son_arama_zamani, sonraki_arama_zamani');

    // Use the safe FetchAll
    const rows = await fetchAllLeads(query);

    // If rows is empty, return zeros but don't crash
    if (!rows) return null;

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

    const statusCounts: Record<string, number> = {};
    const hourly: Record<number, number> = {};

    const isSales_REP = user?.role === 'SALES_REP';
    const filterEmail = user?.email;

    const todayStr = new Date().toISOString().split('T')[0];

    for (const r of rows) {
        const c = r;

        // 1. AVAILABILITY
        let isAvail = false;
        if (!c.sahip_email) {
            if (c.durum === 'Yeni' || !c.durum) { isAvail = true; waiting_new++; }
            else if (c.durum === 'Daha sonra aranmak istiyor' && c.sonraki_arama_zamani) {
                if (new Date(c.sonraki_arama_zamani).getTime() <= nowTime) isAvail = true;
            }
            else if (['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'].includes(c.durum)) {
                if (!c.son_arama_zamani || (nowTime - new Date(c.son_arama_zamani).getTime() > TWO_HOURS)) isAvail = true;
            }
        }
        if (isAvail) available++;

        // 2. MY STATS
        if (isSales_REP && c.sahip_email !== filterEmail) continue;

        if (c.durum) statusCounts[c.durum] = (statusCounts[c.durum] || 0) + 1;

        if (c.son_arama_zamani && c.son_arama_zamani.startsWith(todayStr)) {
            today_called++;
        }

        if (c.durum === 'Başvuru alındı') pending_approval++;
        if (c.durum === 'Kefil bekleniyor') waiting_guarantor++;
        if (c.durum === 'Teslim edildi') delivered++;
        if (c.durum === 'Onaylandı') approved++;

        if (c.durum === 'Daha sonra aranmak istiyor') {
            total_scheduled++;
            if (c.sonraki_arama_zamani && new Date(c.sonraki_arama_zamani).getTime() <= nowTime) waiting_scheduled++;
        }

        if (['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'].includes(c.durum)) {
            if (!c.son_arama_zamani || (nowTime - new Date(c.son_arama_zamani).getTime() > TWO_HOURS)) waiting_retry++;
        }
    }

    return {
        available,
        waiting_new,
        waiting_scheduled,
        total_scheduled,
        waiting_retry,
        pending_approval,
        waiting_guarantor,
        delivered,
        approved,
        today_called,
        statusCounts,
        hourly
    };
}

function mapRowToCustomer(row: any): Customer {
    return {
        id: row.id,
        created_at: row.created_at,
        created_by: row.created_by,
        ad_soyad: row.ad_soyad,
        telefon: row.telefon,
        tc_kimlik: row.tc_kimlik,
        email: row.email,
        dogum_tarihi: row.dogum_tarihi,
        durum: row.durum,
        sahip: row.sahip_email,
        sehir: row.sehir,
        ilce: row.ilce,
        meslek_is: row.meslek_is,
        son_yatan_maas: row.maas_bilgisi,
        acik_icra_varmi: row.icra_durumu?.acik_icra,
        kapali_icra_varmi: row.icra_durumu?.kapali_icra,
        acik_icra_detay: row.icra_durumu?.detay,
        dava_dosyasi_varmi: row.dava_durumu?.varmi,
        dava_detay: row.dava_durumu?.detay,
        admin_notu: row.admin_notu,
        arama_not_kisa: row.arama_notu,
        basvuru_kanali: row.basvuru_kanali,
        talep_edilen_urun: row.talep_edilen_urun,
        talep_edilen_tutar: row.talep_edilen_tutar,
        onay_durumu: row.onay_durumu,
        sonraki_arama_zamani: row.sonraki_arama_zamani,
        son_arama_zamani: row.son_arama_zamani,
        kilitli_mi: false,
        ...row
    };
}
