
import { supabaseAdmin } from './supabase';
import { Customer, LeadStatus, LogEntry } from './types';

// --- READ OPERATIONS ---

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

    const { data, error } = await query;

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

    let { data: leads, error } = await query;
    if (error) throw error;
    if (!leads) leads = [];

    let filtered = leads.map(mapRowToCustomer);

    if (status === 'HAVUZ') {
        const nowTime = new Date().getTime();
        const TWO_HOURS = 2 * 60 * 60 * 1000;

        filtered = filtered.filter(c => {
            if (c.sahip && c.sahip.length > 0) return false;
            if (c.kilitli_mi === true) return false; // Future proofing

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

// --- WRITE OPERATIONS ---

export async function updateLead(customer: Customer, userEmail: string): Promise<Customer> {
    const now = new Date().toISOString();

    // Logic: Release ownership on certain statuses
    const releaseStatuses = ['Yanlış numara', 'Uygun değil', 'İptal/Vazgeçti'];
    const shouldRelease = releaseStatuses.includes(customer.durum);

    const updates: any = {
        updated_at: now,
        // Map UI fields back to DB fields
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
        maas_bilgisi: customer.maas_bilgisi,

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
    // Map to DB
    const dbRow = {
        ad_soyad: customer.ad_soyad,
        telefon: customer.telefon,
        tc_kimlik: customer.tc_kimlik,
        durum: customer.durum || 'Yeni',
        basvuru_kanali: 'Panel',
        sahip_email: userEmail, // Creator is owner initially? Or admin?
        created_at: new Date().toISOString(),
        // ... add other fields as needed
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
        action: 'UPDATE_STATUS', // Generic
        old_value: 'Active',
        new_value: 'DELETED',
        note: `Deleted by ${userEmail}`
    });
}


// --- COMPLEX LOCKING LOGIC ---

export async function lockNextLead(userEmail: string): Promise<(Customer & { source?: string }) | null> {
    // 1. Fetch Candidates (Optimized: Get potential leads only)
    // We want leads that are:
    // - Not owned
    // - (Yeni OR Empty) OR (Scheduled <= Now) OR (Retry and > 2hrs)

    // Supabase doesn't support complex OR groups easily in one go with JS client without Raw SQL.
    // For simplicity and speed, we'll fetch all unowned leads and filter in memory (like sheets.ts), 
    // but in DB we can at least filter by 'sahip_email' IS NULL.

    const { data: candidates, error } = await supabaseAdmin
        .from('leads')
        .select('*')
        .is('sahip_email', null); // Only unowned

    if (error || !candidates) return null;

    const nowTime = new Date().getTime();
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    const filtered = candidates.filter(c => {
        // Standard PULL Logic

        // 1. Scheduled
        if (c.durum === 'Daha sonra aranmak istiyor') {
            if (c.sonraki_arama_zamani) {
                return new Date(c.sonraki_arama_zamani).getTime() <= nowTime;
            }
            return false;
        }

        // 2. New / Automation
        if (c.durum === 'Yeni' || !c.durum || c.durum.trim() === '') return true;

        // 3. Retry
        const retryStatuses = ['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'];
        if (retryStatuses.includes(c.durum)) {
            if (!c.son_arama_zamani) return true;
            return (nowTime - new Date(c.son_arama_zamani).getTime()) > TWO_HOURS;
        }

        return false;
    });

    if (filtered.length === 0) return null;

    // Sort by Priority (Score)
    filtered.sort((a, b) => {
        const getScore = (c: any) => {
            // 1. Automation (Empty/Null)
            if (!c.durum || c.durum.trim() === '') return 1;
            // 2. Scheduled
            if (c.durum === 'Daha sonra aranmak istiyor') return 2;
            // 3. New
            if (c.durum === 'Yeni') return 3;
            // 4. Retry
            return 4;
        };
        return getScore(a) - getScore(b);
    });

    const target = filtered[0];

    // ATOMIC LOCK ATTEMPT
    // Update ONLY if 'sahip_email' is still NULL.
    const { data: locked, error: lockError } = await supabaseAdmin
        .from('leads')
        .update({
            sahip_email: userEmail,
            durum: 'Aranacak', // Change status to 'Aranacak' immediately
            updated_at: new Date().toISOString()
        })
        .eq('id', target.id)
        .is('sahip_email', null) // Optimistic Lock
        .select()
        .single();

    if (lockError || !locked) {
        // Race condition lost
        console.warn('Race condition lost for lead', target.id);
        // Recursively try again? Or just return null and let front-end retry?
        // Let's return null to avoid infinite loops, UI usually has a button.
        return null;
    }

    // Success! Determining Source for UI
    let source = 'Genel';
    if (target.durum === 'Daha sonra aranmak istiyor') source = '📅 Randevu';
    else if (target.durum === 'Yeni') source = '🆕 Yeni Kayıt';
    else if (!target.durum || target.durum.trim() === '') {
        if (target.tc_kimlik && target.icra_durumu) { // Check for E-Devlet signs if mapped?
            // target doesn't have e_devlet_sifre column in SQL explicitly unless in JSON? 
            // Oh, we didn't migrate e_devlet_sifre to a specific column!
            // It might be in 'icra_durumu' or lost? 
            // WAIT. Looking at schema, we didn't add 'e_devlet_sifre'.
            // It wasn't in the CREATE TABLE explicitly? 
            // Let's check schema. If needed we add it or put in metadata.
            // For now assuming generic automation.
            source = '🤖 Otomasyon';
        } else {
            source = '🤖 Otomasyon';
        }
    }
    else source = '♻️ Tekrar Arama';

    // Log it
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
    // For performance, we can do Count queries.
    // Fetching all might be okay for now (< 10k rows), but let's be smarter later.
    // Replicating Sheets logic which fetches all for complex processing.
    const { data: rows } = await supabaseAdmin.from('leads').select('*');
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
        const c = mapRowToCustomer(r);

        // 1. AVAILABILITY (Same logic as manual)
        let isAvail = false;
        if (!c.sahip) {
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
        if (isSales_REP && c.sahip !== filterEmail) continue;

        if (c.durum) statusCounts[c.durum] = (statusCounts[c.durum] || 0) + 1;

        if (c.son_arama_zamani) {
            const d = new Date(c.son_arama_zamani);
            // Check if today (UTC approx match or need TZ)
            // Simpler string match for now
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
        maas_bilgisi: row.maas_bilgisi,

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
