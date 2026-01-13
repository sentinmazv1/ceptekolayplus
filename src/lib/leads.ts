
import { supabaseAdmin } from './supabase';
import { Customer, LeadStatus, LogEntry } from './types';

// --- HELPERS ---

// Supabase has a default limit of 1000 rows. We need to loop for stats.
async function fetchAllLeads(queryBuilder: any): Promise<any[]> {
    let allRows: any[] = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await queryBuilder
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allRows = allRows.concat(data);

        if (data.length < pageSize) break; // Last page
        page++;
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

    // For lists, 1000 is usually enough, but if filtering returns < 1000 from a larger set, 
    // Supabase filtering works on DB side, so we get 1000 *matches*.
    // However, if we want ALL matches to do client side stuff, we should use range.
    // For now, let's bump the limit to a safe number for LIST views using range if needed.
    // But filters are applied first, so we get the first 1000 matching rows.
    // Let's just default to a higher limit like 2000 for standard lists.
    const { data, error } = await query.range(0, 2000);

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

    // For 'HAVUZ' and large status lists, we might need more than 1000.
    // Let's use the Looper if likely to be large, or just a large range.
    // Given 2500 total rows, fetching all for filtering is safer for now.

    let leads: any[] = [];

    // Using fetchAllLeads only for HAVUZ or Admin views to ensure accuracy
    // Optimization: Only fetch all if filters are broad.
    if (status === 'HAVUZ' || user.role === 'ADMIN') {
        // Re-construct query because fetchAllLeads consumes it? 
        // Actually we can just chain range in the loop.
        leads = await fetchAllLeads(query);
    } else {
        const { data, error } = await query.range(0, 2000);
        if (error) throw error;
        leads = data || [];
    }

    let filtered = leads.map(mapRowToCustomer);

    if (status === 'HAVUZ') {
        const nowTime = new Date().getTime();
        const TWO_HOURS = 2 * 60 * 60 * 1000;

        filtered = filtered.filter(c => {
            if (c.sahip && c.sahip.length > 0) return false;
            // c.kilitli_mi check omitted as not fully migrated/used yet

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
    } else {
        filtered = filtered.filter(c => c.durum === status);
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

    if (error) {
        console.error('Search error:', error);
        return [];
    }

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
    // We want unowned ones from the start.
    // If there are many candidates, 1000 limit might hide the "best" one if we are unlucky?
    // Unlikely, as we usually process FIFO or priority.
    // Fetching 1000 unowned should be enough to find *one* to lock.

    // However, if we heavily rely on "Created At" for priority, and the first 1000 aren't the oldest?
    // select('*') order is undefined unless specified.

    // Let's rely on standard fetch for candidates, but order by created_at asc to get oldest first?
    const { data: candidates, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .is('sahip_email', null)
        .limit(100); // Only need top candidates really

    if (error || !candidates) return null;

    // ... filtering logic ...
    // Note: Re-using existing logic but optimized request size.

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

    if (lockError || !locked) {
        return null;
    }

    let source = 'Genel';
    if (target.durum === 'Daha sonra aranmak istiyor') source = '📅 Randevu';
    else if (target.durum === 'Yeni') source = '🆕 Yeni Kayıt';
    else if (!target.durum || target.durum.trim() === '') {
        source = '🤖 Otomasyon';
    }
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

// --- LOGGING & STATS ---

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

    const { data } = await query.order('created_at', { ascending: false });

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

export async function getLeadStats(user?: { email: string; role: string }) {
    // CRITICAL: Must fetch all records to calculate stats.
    // Using fetchAllLeads loop.

    // Optimized selection to reduce bandwidth
    const query = supabaseAdmin.from('leads').select('durum, sahip_email, son_arama_zamani, sonraki_arama_zamani');
    const rows = await fetchAllLeads(query);

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
        // partial mapper logic since we only selected a few fields
        const c = r;

        // 1. AVAILABILITY
        let isAvail = false;
        // Fix: check sahip_email specifically (db column name)
        // r has raw DB props if not mapped.
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

        if (c.son_arama_zamani) {
            if (c.son_arama_zamani.startsWith(todayStr)) today_called++;
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


// --- MAPPER ---
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

        kilitli_mi: false, // Not used in DB impl

        ...row
    };
}
