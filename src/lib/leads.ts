
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

    // Standard UI Limit (1000). For 100k rows, we would implement real pagination (page 1, 2, 3).
    // But for now, fetching the recent 1000 is standard behavior.
    const { data, error } = await query.order('created_at', { ascending: false }).limit(1000);

    if (error) throw error;
    return (data || []).map(mapRowToCustomer);
}

export async function getCustomersByStatus(status: string, user: { email: string; role: string }): Promise<Customer[]> {
    let query = supabaseAdmin.from('leads').select('*');

    if (user.role === 'SALES_REP' && status !== 'HAVUZ') {
        query.eq('sahip_email', user.email);
    }

    if (status !== 'HAVUZ') {
        query.eq('durum', status);
    } else {
        query.is('sahip_email', null);
    }

    // LIST VIEW: Limit to 1000 recent items.
    // This is NOT a data loss issue, it's a UI View limit.
    const { data, error } = await query.order('created_at', { ascending: false }).limit(1000);
    if (error) throw error;

    let leads = data || [];
    let filtered = leads.map(mapRowToCustomer);

    // Javascript Filter for HAVUZ (Complex Logic)
    // Note: Since we only fetched 1000 UNOWNED leads, this is safe.
    // Even with 100k total customers, the "Pool" (Unassigned) is usually small (<1000).
    // If Pool > 1000, we show the first 1000.
    if (status === 'HAVUZ') {
        const nowTime = new Date().getTime();
        const TWO_HOURS = 2 * 60 * 60 * 1000;

        filtered = filtered.filter(c => {
            if (c.sahip && c.sahip.length > 0) return false;

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

// --- SCALABLE STATS ---

export async function getLeadStats(user?: { email: string; role: string }) {
    // OLD WAY: Fetch All -> Count in JS (Crashes on large data)
    // NEW WAY: Database Counts using `.count()` and efficient filtering.

    const isSales_REP = user?.role === 'SALES_REP';
    const filterEmail = user?.email;
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. COMPLEX COUNTS (Availability)
    // For availability, complexity implies retrieving candidate rows.
    // However, we only need to fetch "Unowned" rows, which is a much smaller subset than "All History".
    // This scales because processed leads (99% of DB) are ignored.

    const { data: poolCandidates } = await supabaseAdmin
        .from('leads')
        .select('durum, sonraki_arama_zamani, son_arama_zamani')
        .is('sahip_email', null); // Fetch ONLY unowned

    // JS Logic for Pool (Fast on small subset)
    const nowTime = new Date().getTime();
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    let available = 0;
    let waiting_new = 0;

    if (poolCandidates) {
        for (const c of poolCandidates) {
            let isAvail = false;
            // Null/Empty or Yeni -> Always available
            if (c.durum === 'Yeni' || !c.durum) {
                isAvail = true;
                waiting_new++;
            }
            // Scheduled -> Time Check
            else if (c.durum === 'Daha sonra aranmak istiyor' && c.sonraki_arama_zamani) {
                if (new Date(c.sonraki_arama_zamani).getTime() <= nowTime) isAvail = true;
            }
            // Retry -> Timeout Check
            else if (['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'].includes(c.durum)) {
                if (!c.son_arama_zamani || (nowTime - new Date(c.son_arama_zamani).getTime() > TWO_HOURS)) isAvail = true;
            }

            if (isAvail) available++;
        }
    }

    // 2. SIMPLE COUNTS (DB Aggregation)
    // We can run these in parallel.

    // Helper for role-based filtering
    const baseFilter = (q: any) => {
        if (isSales_REP) return q.eq('sahip_email', filterEmail);
        return q;
    };

    // Prepare Promises
    const pScheduled = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('durum', 'Daha sonra aranmak istiyor'));
    const pRetry = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).in('durum', ['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok']));
    const pPending = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('durum', 'Başvuru alındı'));
    const pGuarantor = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('durum', 'Kefil bekleniyor'));
    const pDelivered = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('durum', 'Teslim edildi'));
    const pApproved = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('durum', 'Onaylandı'));

    // Today Called: Requires filtering by string date (DB Index recommended later)
    const pToday = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).ilike('son_arama_zamani', `${todayStr}%`));

    // Execute Parallel
    const [
        { count: total_scheduled },
        { count: waiting_retry_raw },
        { count: pending_approval },
        { count: waiting_guarantor },
        { count: delivered },
        { count: approved },
        { count: today_called }
    ] = await Promise.all([pScheduled, pRetry, pPending, pGuarantor, pDelivered, pApproved, pToday]);

    // Note: waiting_retry in DB count includes ALL retry statuses.
    // To match legacy logic "Available for retry > 2 hours", we used JS above for the Pool.
    // For the User's Dashboard "Waiting Retry" box, usually they want to see "Total in Retry Status" or "Actually Waiting"?
    // The legacy code calculated "waiting_retry" as Available ones.
    // Let's stick to total DB count for the "Retry" box to show volume, OR keep consistent.
    // Actually, dashboard usually shows "Working on it" piles.
    // Let's use the DB count for 'Total Retry Pile' which is faster.
    // Or if we need exact "available retry", we already calculated it in the Pool loop if unowned.
    // If owned, we need to check time. 
    // Complexity: If Sales Rep owns it, is it "Waiting" if it's too early? Yes, technically just not pullable.
    // Let's simplify: "Waiting Retry" = Total count of retry statuses assigned to user (or all if admin).
    // This matches the DB count `waiting_retry_raw`.

    // Status Breakdown (Pie Chart data)
    // We can't do GroupBy easily without RPC.
    // For now, we can omit it or make a separate RPC call later. 
    // Or fetch just the 'durum' column for filtered rows.
    // Let's fetch just 'durum' for the User/Admin to build the chart.
    // 100k rows of just "String" is ~1MB. Doable.

    const { data: allStatuses } = await baseFilter(supabaseAdmin.from('leads').select('durum'));
    const statusCounts: Record<string, number> = {};
    if (allStatuses) {
        allStatuses.forEach((r: any) => {
            if (r.durum) statusCounts[r.durum] = (statusCounts[r.durum] || 0) + 1;
        });
    }

    // Waiting Scheduled (Time check)
    // We have total_scheduled. How many are "Waiting"? 
    // DB Filter: sonraki_arama_zamani <= NOW
    const nowISO = new Date().toISOString();
    const { count: waiting_scheduled } = await baseFilter(
        supabaseAdmin.from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('durum', 'Daha sonra aranmak istiyor')
            .lte('sonraki_arama_zamani', nowISO) // Database Time Comparison
    );

    return {
        available: available || 0, // Calculated from Pool Candidates
        waiting_new: waiting_new || 0, // Calculated from Pool Candidates
        waiting_scheduled: waiting_scheduled || 0,
        total_scheduled: total_scheduled || 0,
        waiting_retry: waiting_retry_raw || 0,
        pending_approval: pending_approval || 0,
        waiting_guarantor: waiting_guarantor || 0,
        delivered: delivered || 0,
        approved: approved || 0,
        today_called: today_called || 0,
        statusCounts: statusCounts,
        hourly: {} // Deprecated/Empty for now
    };
}

// --- REST UNCHANGED ---

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
