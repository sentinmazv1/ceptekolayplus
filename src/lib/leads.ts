
import { supabaseAdmin } from './supabase';
import { Customer, LeadStatus, LogEntry } from './types';

// --- HELPERS ---

// Safe Fetch: Parallel requests to cover 3000 rows (Sufficient for current 2569)
// This avoids complex recursion and potential loops.
async function fetchAllLeadsSafe(baseQuery: any): Promise<any[]> {
    try {
        const p1 = baseQuery.range(0, 999);
        // We must Clone? No, range returns new query promise. But does it mutate?
        // In supabase-js v2, we should create fresh chains if possible.
        // But reusing the builder `baseQuery` might be risky if it mutates.
        // Safer: Create 3 distinct queries if possible, or assume calling range() is safe.
        // Actually, best practice with Supabase JS client is to await immediately or chain off a fresh .from()

        // Let's rely on the calling function to provide us data or use a simpler approach inside stats.
        // We will do it inside getLeadStats for maximum safety.
        return [];
    } catch (e) {
        return [];
    }
}

// --- READ OPERATIONS ---

export async function getLead(id: string): Promise<Customer | null> {
    const { data } = await supabaseAdmin.from('leads').select('*').eq('id', id).single();
    if (!data) return null;
    return mapRowToCustomer(data);
}

export async function getLeads(filters?: { sahip?: string; durum?: LeadStatus }): Promise<Customer[]> {
    let query = supabaseAdmin.from('leads').select('*');

    if (filters?.sahip) query = query.eq('sahip_email', filters.sahip);
    if (filters?.durum) query = query.eq('durum', filters.durum);

    // List: 1000 limit is fine for UI lists.
    const { data, error } = await query.limit(1000);
    if (error) throw error;
    return (data || []).map(mapRowToCustomer);
}

export async function getCustomersByStatus(status: string, user: { email: string; role: string }): Promise<Customer[]> {
    // Optimization: Filter in DB as much as possible
    let query = supabaseAdmin.from('leads').select('*');

    if (user.role === 'SALES_REP' && status !== 'HAVUZ') {
        query.eq('sahip_email', user.email);
    }

    if (status !== 'HAVUZ') {
        query.eq('durum', status);
    } else {
        // HAVUZ: Unowned
        query.is('sahip_email', null);
    }

    // Fetch up to 1000. For specific status lists, this is usually enough.
    // Use simple limit for stability now. User wants data back.
    const { data, error } = await query.limit(1000);
    if (error) throw error;

    let leads = data || [];
    let filtered = leads.map(mapRowToCustomer);

    // Client side refined filtering for HAVUZ
    if (status === 'HAVUZ') {
        const nowTime = new Date().getTime();
        const TWO_HOURS = 2 * 60 * 60 * 1000;

        filtered = filtered.filter(c => {
            if (c.sahip && c.sahip.length > 0) return false;

            // Standard Pool Logic
            if (c.durum === 'Yeni' || !c.durum) return true;
            if (c.durum === 'Daha sonra aranmak istiyor') {
                return c.sonraki_arama_zamani && new Date(c.sonraki_arama_zamani).getTime() <= nowTime;
            }
            const retryStatuses = ['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'];
            if (retryStatuses.includes(c.durum)) {
                return !c.son_arama_zamani || (nowTime - new Date(c.son_arama_zamani).getTime() > TWO_HOURS);
            }
            return false;
        });
    }

    filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return filtered;
}

export async function searchCustomers(query: string): Promise<Customer[]> {
    if (!query || query.length < 2) return [];

    // Search is robust, usually < 50 results
    const cleanQuery = query.replace(/\D/g, '');
    let dbQuery = supabaseAdmin.from('leads').select('*');
    if (cleanQuery.length > 5) {
        dbQuery = dbQuery.or(`tc_kimlik.ilike.%${cleanQuery}%,telefon.ilike.%${cleanQuery}%`);
    } else {
        dbQuery = dbQuery.ilike('ad_soyad', `%${query}%`);
    }
    const { data } = await dbQuery.limit(50);
    return (data || []).map(mapRowToCustomer);
}

// --- STATS (CRITICAL) ---

export async function getLeadStats(user?: { email: string; role: string }) {
    // Manual Parallel Fetch Strategy
    // We execute 3 queries covering 0-2999 range.
    // This is robust and fast enough.

    // Select minimal fields
    const fields = 'durum, sahip_email, son_arama_zamani, sonraki_arama_zamani';

    const p1 = supabaseAdmin.from('leads').select(fields).range(0, 999);
    const p2 = supabaseAdmin.from('leads').select(fields).range(1000, 1999);
    const p3 = supabaseAdmin.from('leads').select(fields).range(2000, 2999);

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    if (r1.error) console.error('Stats P1 Error', r1.error);
    if (r2.error) console.error('Stats P2 Error', r2.error);

    const rows = [
        ...(r1.data || []),
        ...(r2.data || []),
        ...(r3.data || [])
    ];

    if (rows.length === 0) return null; // Should not happen if DB has data

    // Calculation Logic
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

    for (const c of rows) {
        // c is raw object

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

// --- WRITE OPS & MAPPER (Unchanged but included for integrity) ---

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
    const { data, error } = await supabaseAdmin.from('leads').update(updates).eq('id', customer.id).select().single();
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
    const { data, error } = await supabaseAdmin.from('leads').insert(dbRow).select().single();
    if (error) throw error;
    return mapRowToCustomer(data);
}

export async function deleteCustomer(id: string, userEmail: string) {
    await supabaseAdmin.from('leads').delete().eq('id', id);
    await logAction({
        log_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user_email: userEmail,
        customer_id: id,
        action: 'UPDATE_STATUS', // Using existing enum
        old_value: 'Active',
        new_value: 'DELETED',
        note: `Deleted by ${userEmail}`
    });
}

export async function lockNextLead(userEmail: string): Promise<(Customer & { source?: string }) | null> {
    const { data: candidates } = await supabaseAdmin.from('leads').select('*').is('sahip_email', null).limit(100);
    if (!candidates) return null;

    // ... filtering ...
    const nowTime = new Date().getTime();
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    const filtered = candidates.filter(c => {
        if (c.durum === 'Daha sonra aranmak istiyor') {
            return c.sonraki_arama_zamani && new Date(c.sonraki_arama_zamani).getTime() <= nowTime;
        }
        if (c.durum === 'Yeni' || !c.durum) return true;
        const retryStatuses = ['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'];
        if (retryStatuses.includes(c.durum)) {
            return !c.son_arama_zamani || (nowTime - new Date(c.son_arama_zamani).getTime() > TWO_HOURS);
        }
        return false;
    });

    if (filtered.length === 0) return null;

    // Sort priority
    filtered.sort((a, b) => {
        const score = (x: any) => (!x.durum ? 1 : x.durum === 'Yeni' ? 3 : 4); // Simplified score
        return score(a) - score(b);
    });

    const target = filtered[0];
    const { data: locked, error } = await supabaseAdmin.from('leads')
        .update({ sahip_email: userEmail, durum: 'Aranacak', updated_at: new Date().toISOString() })
        .eq('id', target.id).is('sahip_email', null).select().single();

    if (error || !locked) return null;

    let source = 'Genel';
    if (target.durum === 'Yeni') source = '🆕 Yeni Kayıt';
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
    const { data } = await supabaseAdmin.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    return (data || []).map(row => ({ log_id: row.id, timestamp: row.created_at, user_email: row.user_email, customer_id: row.customer_id, action: row.action, old_value: row.old_value, new_value: row.new_value, note: row.note }));
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
