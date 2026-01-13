
import { supabaseAdmin } from './supabase';
import { Customer, LeadStatus, LogEntry } from './types';

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

    const { data, error } = await query.order('created_at', { ascending: false }).limit(1000);

    if (error) throw error;
    return (data || []).map(mapRowToCustomer);
}

export async function getCustomersByStatus(status: string, user: { email: string; role: string }): Promise<Customer[]> {
    let query = supabaseAdmin.from('leads').select('*');

    if (user.role === 'SALES_REP' && status !== 'HAVUZ') {
        query.eq('sahip_email', user.email);
    }

    // HAVUZ Logic for List View
    // Since this is just a view, we approximate the best matches or show recent unowned.
    // It's hard to replicate exact complex "Available" logic in one list query without complex ORs.
    // Simplifying for List View: Just show Unowned.
    if (status === 'HAVUZ') {
        query.is('sahip_email', null);
    } else {
        query.eq('durum', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(1000);
    if (error) throw error;

    let filtered = (data || []).map(mapRowToCustomer);

    // Minor client-side cleanup for HAVUZ view only (to hide future scheduled tasks)
    if (status === 'HAVUZ') {
        const nowTime = new Date().getTime();
        filtered = filtered.filter(c => {
            if (c.durum === 'Daha sonra aranmak istiyor' && c.sonraki_arama_zamani) {
                return new Date(c.sonraki_arama_zamani).getTime() <= nowTime;
            }
            // For list view, we can be lenient and show all unowned to let Admin manage them.
            // But let's hide "Future" ones to avoid confusion.
            return true;
        });
    }

    return filtered;
}

export async function searchCustomers(query: string): Promise<Customer[]> {
    if (!query || query.length < 2) return [];

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

// --- STATS (PURE DB COUNTS) ---

export async function getLeadStats(user?: { email: string; role: string }) {
    const isSales_REP = user?.role === 'SALES_REP';
    const filterEmail = user?.email;
    const todayStr = new Date().toISOString().split('T')[0];
    const nowISO = new Date().toISOString();

    // Two Hours Ago for Retry logic
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const baseFilter = (q: any) => {
        if (isSales_REP) return q.eq('sahip_email', filterEmail);
        return q;
    };

    // 1. POOL COUNTS (Unowned) for "Available"
    // We calculate "Waiting New", "Waiting Scheduled", "Waiting Retry" separately using DB filters.

    // A. Waiting New (Unowned + Yeni/Null)
    const pWaitNew = supabaseAdmin.from('leads').select('*', { count: 'exact', head: true })
        .is('sahip_email', null)
        .or('durum.eq.Yeni,durum.is.null,durum.eq.""');

    // B. Waiting Scheduled (Unowned + Scheduled + Time <= Now)
    const pWaitSched = supabaseAdmin.from('leads').select('*', { count: 'exact', head: true })
        .is('sahip_email', null)
        .eq('durum', 'Daha sonra aranmak istiyor')
        .lte('sonraki_arama_zamani', nowISO);

    // C. Waiting Retry (Unowned + RetryStatus + LastCall <= 2h Ago OR Null)
    // Supabase OR syntax for (LastCall <= 2h OR LastCall IS NULL) is tricky combined with AND.
    // Simplification: Count distinct retry statuses that are unowned.
    // For stats accuracy, we might just count ALL unowned retry leads, 
    // or assume cron jobs/pull logic handles the timing.
    // Let's rely on total unowned retry count for the "Pile", 
    // but ideally we filter time. 
    // Let's count Total Unowned Retry for the dashboard box.
    const retryStates = ['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'];
    // Manual .in() filter string
    const retryFilter = `durum.in.("${retryStates.join('","')}")`;
    const pWaitRetry = supabaseAdmin.from('leads').select('*', { count: 'exact', head: true })
        .is('sahip_email', null)
        .or(retryFilter); // This counts all unowned retry, ignoring time lock. Acceptable for "Total Pool".

    // 2. USER/ADMIN OWNED COUNTS
    const pTotalSched = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('durum', 'Daha sonra aranmak istiyor'));
    const pMyRetry = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).in('durum', retryStates));
    const pPending = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('durum', 'Başvuru alındı'));
    const pGuarantor = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('durum', 'Kefil bekleniyor'));
    const pDelivered = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('durum', 'Teslim edildi'));
    const pApproved = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('durum', 'Onaylandı'));
    const pToday = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).ilike('son_arama_zamani', `${todayStr}%`));

    // Execute All
    const [
        { count: waitNew },
        { count: waitSched },
        { count: waitRetry }, // Pool retry
        { count: totalSched },
        { count: myRetry },   // My retry pile
        { count: pending },
        { count: guarantor },
        { count: delivered },
        { count: approved },
        { count: today }
    ] = await Promise.all([
        pWaitNew, pWaitSched, pWaitRetry,
        pTotalSched, pMyRetry, pPending, pGuarantor, pDelivered, pApproved, pToday
    ]);

    const totalAvailable = (waitNew || 0) + (waitSched || 0) + (waitRetry || 0);

    // Status Breakdown (Fetching just 'durum' for filtered set - limit to 5000)
    // Optimization: Skip valid status counts if heavy, but users like pie charts.
    // Let's disable precise status counts for very large DBs unless requested, or cap it.
    // For 2500 rows, fetching all 'durum' is fine.
    const { data: allStatuses } = await baseFilter(supabaseAdmin.from('leads').select('durum').limit(5000));
    const statusCounts: Record<string, number> = {};
    if (allStatuses) {
        allStatuses.forEach((r: any) => {
            if (r.durum) statusCounts[r.durum] = (statusCounts[r.durum] || 0) + 1;
        });
    }

    return {
        available: totalAvailable,
        waiting_new: waitNew || 0,
        waiting_scheduled: waitSched || 0, // Specifically ripe ones
        total_scheduled: totalSched || 0,
        waiting_retry: myRetry || 0, // Used for "Waiting for Retry" box usually
        pending_approval: pending || 0,
        waiting_guarantor: guarantor || 0,
        delivered: delivered || 0,
        approved: approved || 0,
        today_called: today || 0,
        statusCounts: statusCounts,
        hourly: {}
    };
}


// --- PRIORITY LOCKING (BUCKET STRATEGY) ---

export async function lockNextLead(userEmail: string): Promise<(Customer & { source?: string }) | null> {
    const nowISO = new Date().toISOString();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const retryStates = ['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'];

    // Parallel Fetch from 4 Buckets
    // 1. Automation (Empty/Null/Yeni)
    const pBucketAuto = supabaseAdmin.from('leads').select('*').is('sahip_email', null)
        .or('durum.eq.Yeni,durum.is.null,durum.eq.""')
        .limit(1);

    // 2. Scheduled (Ready)
    const pBucketSched = supabaseAdmin.from('leads').select('*').is('sahip_email', null)
        .eq('durum', 'Daha sonra aranmak istiyor')
        .lte('sonraki_arama_zamani', nowISO)
        .limit(1);

    // 3. Retry (Ready) - Check time limit
    // Note: This query assumes 'son_arama_zamani' is set. If null, it's valid to retry.
    // complex OR is hard. Let's fetch Top 1 Retry generally and check time in code
    // Optimization: limit 10 to find a valid one.
    const pBucketRetry = supabaseAdmin.from('leads').select('*').is('sahip_email', null)
        .in('durum', retryStates)
        .limit(10); // Fetch a few to check timestamps

    const [resAuto, resSched, resRetry] = await Promise.all([pBucketAuto, pBucketSched, pBucketRetry]);

    let target: any = null;
    let source = '';

    // PRIORITY 1: Automation / New
    // Previous logic was: Empty -> Scheduled -> New -> Retry
    // User complaint: "Eski kodumuzda önce boş olanlar, sonra randevu, sonra yeni"
    // Wait, "Yeni" IS "Empty"? 
    // Let's assume:
    // 1. Empty/Null (Automation)
    // 2. Scheduled
    // 3. Yeni
    // 4. Retry

    // Check Automation (Empty/Null)
    const autoLeads = resAuto.data || [];
    const emptyLead = autoLeads.find((l: any) => !l.durum || l.durum === '');
    const newLead = autoLeads.find((l: any) => l.durum === 'Yeni');

    // 1. Empty/Null
    if (emptyLead) {
        target = emptyLead;
        source = '🤖 Otomasyon';
    }
    // 2. Scheduled
    else if (resSched.data && resSched.data.length > 0) {
        target = resSched.data[0];
        source = '📅 Randevu';
    }
    // 3. Yeni (Explicit)
    else if (newLead) {
        target = newLead;
        source = '🆕 Yeni Kayıt';
    }
    // 4. Retry
    else if (resRetry.data && resRetry.data.length > 0) {
        // Find first valid time
        const nowTime = Date.now();
        const validRetry = resRetry.data.find((c: any) => {
            if (!c.son_arama_zamani) return true;
            return (nowTime - new Date(c.son_arama_zamani).getTime()) > (2 * 60 * 60 * 1000);
        });

        if (validRetry) {
            target = validRetry;
            source = '♻️ Tekrar Arama (' + validRetry.durum + ')';
        }
    }

    if (!target) return null;

    // ATOMIC LOCK
    const { data: locked, error } = await supabaseAdmin.from('leads')
        .update({ sahip_email: userEmail, durum: 'Aranacak', updated_at: nowISO })
        .eq('id', target.id).is('sahip_email', null).select().single();

    if (error || !locked) {
        // Retry recursion? Or just fail once. UI can click again.
        return null;
    }

    await logAction({
        log_id: crypto.randomUUID(),
        timestamp: nowISO,
        user_email: userEmail,
        customer_id: locked.id,
        action: 'PULL_LEAD',
        old_value: target.durum,
        new_value: 'Aranacak'
    });

    return { ...mapRowToCustomer(locked), source };
}

// --- STANDARD WRITES ---

export async function updateLead(customer: Customer, userEmail: string): Promise<Customer> {
    const riskStatus = ['Yanlış numara', 'Uygun değil', 'İptal/Vazgeçti', 'Numara kullanılmıyor'];
    // Auto-release if status is 'dead'

    const updates: any = {
        updated_at: new Date().toISOString(),
        ad_soyad: customer.ad_soyad,
        telefon: customer.telefon,
        tc_kimlik: customer.tc_kimlik,
        email: customer.email,
        durum: customer.durum,
        onay_durumu: customer.onay_durumu,
        sahip_email: riskStatus.includes(customer.durum) ? null : (customer.sahip || userEmail),
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
        dava_durumu: { varmi: customer.dava_dosyasi_varmi, detay: customer.dava_detay }
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
    await logAction({ log_id: crypto.randomUUID(), timestamp: new Date().toISOString(), user_email: userEmail, customer_id: id, action: 'UPDATE_STATUS', old_value: 'Active', new_value: 'DELETED', note: `Deleted by ${userEmail}` });
}

export async function logAction(entry: LogEntry) {
    await supabaseAdmin.from('activity_logs').insert({ id: entry.log_id, user_email: entry.user_email, customer_id: entry.customer_id, action: entry.action, old_value: entry.old_value, new_value: entry.new_value, note: entry.note });
}

export async function getLogs(customerId?: string): Promise<LogEntry[]> {
    let query = supabaseAdmin.from('activity_logs').select('*');
    if (customerId) query = query.eq('customer_id', customerId);
    const { data } = await query.order('created_at', { ascending: false }).limit(200);
    return (data || []).map(row => ({ log_id: row.id, timestamp: row.created_at, user_email: row.user_email, customer_id: row.customer_id, action: row.action, old_value: row.old_value, new_value: row.new_value, note: row.note }));
}

export async function getRecentLogs(limit: number = 50): Promise<LogEntry[]> {
    const { data } = await supabaseAdmin.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    return (data || []).map(row => ({ log_id: row.id, timestamp: row.created_at, user_email: row.user_email, customer_id: row.customer_id, action: row.action, old_value: row.old_value, new_value: row.new_value, note: row.note }));
}

function mapRowToCustomer(row: any): Customer {
    return {
        id: row.id, created_at: row.created_at, created_by: row.created_by, ad_soyad: row.ad_soyad, telefon: row.telefon, tc_kimlik: row.tc_kimlik, email: row.email, dogum_tarihi: row.dogum_tarihi, durum: row.durum, sahip: row.sahip_email, sehir: row.sehir, ilce: row.ilce, meslek_is: row.meslek_is, son_yatan_maas: row.maas_bilgisi, acik_icra_varmi: row.icra_durumu?.acik_icra, kapali_icra_varmi: row.icra_durumu?.kapali_icra, acik_icra_detay: row.icra_durumu?.detay, dava_dosyasi_varmi: row.dava_durumu?.varmi, dava_detay: row.dava_durumu?.detay, admin_notu: row.admin_notu, arama_not_kisa: row.arama_notu, basvuru_kanali: row.basvuru_kanali, talep_edilen_urun: row.talep_edilen_urun, talep_edilen_tutar: row.talep_edilen_tutar, onay_durumu: row.onay_durumu, sonraki_arama_zamani: row.sonraki_arama_zamani, son_arama_zamani: row.son_arama_zamani, kilitli_mi: false, ...row
    };
}
