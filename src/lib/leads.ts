
import { supabaseAdmin } from './supabase';
import { Customer, LeadStatus, LogEntry } from './types';

const retryStates = ['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'];

// --- READ OPERATIONS ---

export async function getLead(id: string): Promise<Customer | null> {
    const { data } = await supabaseAdmin.from('leads').select('*').eq('id', id).single();
    if (!data) return null;
    return mapRowToCustomer(data);
}

export async function getLeads(filters?: { sahip?: string; durum?: LeadStatus | string }): Promise<Customer[]> {
    let query = supabaseAdmin.from('leads').select('*');

    if (filters?.sahip) query = query.eq('sahip_email', filters.sahip);

    // Explicit Status Filter
    if (filters?.durum) {
        query = query.eq('durum', filters.durum);
    } else {
        // Default View: Exclude 'TALEP_BEKLEYEN' (Requests) so they don't pollute the main list
        // Unless we are specifically asking for them, we hide them.
        query = query.neq('durum', 'TALEP_BEKLEYEN');
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(1000);

    if (error) throw error;
    return (data || []).map(mapRowToCustomer);
}

// Special dashboard function to handle "Owner OR Creator" visibility
export async function getLeadsForDashboard(userEmail: string, status?: string): Promise<Customer[]> {
    // Strategy: robust "Fetch All Potentials" and filter unique. 
    // This avoids complex Supabase OR syntax issues with special chars in emails.

    // 1. Fetch Owned
    let q1 = supabaseAdmin.from('leads').select('*').eq('sahip_email', userEmail);
    // 2. Fetch Created by Me (but possibly assigned to others)
    let q2 = supabaseAdmin.from('leads').select('*').eq('created_by', userEmail);

    if (status && status !== 'Tüm Durumlar') {
        q1 = q1.eq('durum', status);
        q2 = q2.eq('durum', status);
    }

    const [res1, res2] = await Promise.all([
        q1.order('updated_at', { ascending: false }).limit(200),
        q2.order('updated_at', { ascending: false }).limit(200)
    ]);

    if (res1.error) throw res1.error;
    if (res2.error) throw res2.error;

    // Merge and Deduplicate by ID
    const map = new Map<string, any>();
    (res1.data || []).forEach(r => map.set(r.id, r));
    (res2.data || []).forEach(r => map.set(r.id, r));

    const combined = Array.from(map.values());

    // Re-sort in memory (since we merged two sorted lists)
    combined.sort((a, b) => {
        const da = new Date(a.updated_at || 0).getTime();
        const db = new Date(b.updated_at || 0).getTime();
        return db - da;
    });

    return combined.slice(0, 200).map(mapRowToCustomer);
}

export async function getDashboardStatsCounts(userEmail: string, isAdmin: boolean) {
    // If Admin, use efficient DB-side aggregation (Counts)
    if (isAdmin) {
        const pApproved = supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('durum', 'Onaylandı');
        const pGuarantor = supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('durum', 'Kefil bekleniyor');

        // Delivered (ALL TIME) - Removed date filter as requested
        const pDelivered = supabaseAdmin.from('leads').select('id', { count: 'exact', head: true })
            .or('durum.eq.Teslim edildi,durum.eq.Satış yapıldı/Tamamlandı');

        const [{ count: approved }, { count: guarantor }, { count: delivered }] = await Promise.all([pApproved, pGuarantor, pDelivered]);

        return {
            approved: approved || 0,
            guarantor: guarantor || 0,
            delivered: delivered || 0
        };
    }

    // If Personnel (User Isolation), use reliable Fetch-and-Compute in memory 
    // to handle "Owned OR Created" logic without OR Syntax risks.
    // We fetch simplified objects to keep it lightweight.

    // 1. Fetch Owned Ids/Status - Filter by relevant statuses to avoid 1000 row limit truncation
    const relevantStatuses = ['Onaylandı', 'Kefil bekleniyor', 'Teslim edildi', 'Satış yapıldı/Tamamlandı'];

    const q1 = supabaseAdmin.from('leads')
        .select('id, durum, teslim_tarihi')
        .eq('sahip_email', userEmail)
        .in('durum', relevantStatuses);

    // 2. Fetch Created Ids/Status
    const q2 = supabaseAdmin.from('leads')
        .select('id, durum, teslim_tarihi')
        .eq('created_by', userEmail)
        .in('durum', relevantStatuses);

    const [res1, res2] = await Promise.all([q1, q2]);

    const uniqueLeads = new Map<string, any>();
    (res1.data || []).forEach(r => uniqueLeads.set(r.id, r));
    (res2.data || []).forEach(r => uniqueLeads.set(r.id, r));

    // Compute Stats
    let approved = 0;
    let guarantor = 0;
    let delivered = 0;

    uniqueLeads.forEach(lead => {
        if (lead.durum === 'Onaylandı') approved++;
        if (lead.durum === 'Kefil bekleniyor') guarantor++;
        // Delivered (ALL TIME)
        if (lead.durum === 'Teslim edildi' || lead.durum === 'Satış yapıldı/Tamamlandı') {
            delivered++;
        }
    });

    return {
        approved,
        guarantor,
        delivered
    };
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

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
    let dbQuery = supabaseAdmin.from('leads').select('*');

    if (isUUID) {
        dbQuery = dbQuery.or(`id.eq.${query},ad_soyad.ilike.%${query}%,tc_kimlik.ilike.%${query}%,telefon.ilike.%${query}%`);
    } else {
        dbQuery = dbQuery.or(`ad_soyad.ilike.%${query}%,tc_kimlik.ilike.%${query}%,telefon.ilike.%${query}%`);
    }
    const { data } = await dbQuery.order('created_at', { ascending: false }).limit(500);
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
    // We want to count only those that are "Ready to Call" to match the Dashboard "Available" perception.
    // Logic: Unowned AND RetryStatus AND (son_arama_zamani < 2h OR son_arama_zamani IS NULL)
    // Note: Supabase JS library OR syntax inside an AND filter is: .or('col.is.null,col.lt.value')
    // We need to apply this ON TOP of the previous filters.

    // 1. Base Pool Query
    let retryQuery = supabaseAdmin.from('leads').select('*', { count: 'exact', head: true })
        .is('sahip_email', null)
        .in('durum', retryStates);

    // 2. Add Time Filter (Optimized: "Ready" means either called long ago or never called timestamp wise)
    // To solve the "800 vs 300" confusion, we interpret "Available" as "Ready to Call Now".
    retryQuery = retryQuery.or(`son_arama_zamani.lt.${twoHoursAgo},son_arama_zamani.is.null`);

    // 4. Retry (Ready)
    // Exclude TALEP_BEKLEYEN from standard pools
    const pWaitRetry = retryQuery.not('durum', 'eq', 'TALEP_BEKLEYEN');

    // 2. USER/ADMIN OWNED COUNTS
    const pTotalSched = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('durum', 'Daha sonra aranmak istiyor'));
    const pMyRetry = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).in('durum', retryStates));
    const pPending = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('durum', 'Başvuru alındı'));
    const pGuarantor = baseFilter(supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('durum', 'Kefil bekleniyor'));

    // DELIVERED: Fetch data to count ITEMS, not just customers
    const pDelivered = baseFilter(supabaseAdmin.from('leads').select('satilan_urunler').eq('durum', 'Teslim edildi'));

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
        { data: deliveredRows },
        { count: approved },
        { count: today }
    ] = await Promise.all([
        pWaitNew, pWaitSched, pWaitRetry,
        pTotalSched, pMyRetry, pPending, pGuarantor, pDelivered, pApproved, pToday
    ]);

    // Calculate Total Delivered ITEMS
    let deliveredItemCount = 0;
    if (deliveredRows) {
        deliveredRows.forEach((r: any) => {
            let c = 0;
            if (r.satilan_urunler) {
                try {
                    const list = typeof r.satilan_urunler === 'string' ? JSON.parse(r.satilan_urunler) : r.satilan_urunler;
                    if (Array.isArray(list)) c = list.length;
                } catch (e) { }
            }
            // Fallback: If status is delivered but list is empty/invalid, count as 1 (Legacy)
            if (c === 0) c = 1;
            deliveredItemCount += c;
        });
    }

    const totalAvailable = (waitNew || 0) + (waitSched || 0) + (waitRetry || 0);

    // Status Breakdown (Fetching just 'durum' for filtered set - limit to 5000)
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
        waiting_retry: waitRetry || 0, // CORRECTED: This should be Pool Retry, not My Retry
        pending_approval: pending || 0,
        waiting_guarantor: guarantor || 0,
        delivered: deliveredItemCount,
        approved: approved || 0,
        today_called: today || 0,
        statusCounts: statusCounts,
        hourly: {}
    };
}

export async function getRequestStats() {
    // Count pending requests (TALEP_BEKLEYEN)
    // We can group by source (basvuru_kanali) for better badges
    const { data, error } = await supabaseAdmin
        .from('leads')
        .select('basvuru_kanali')
        .eq('durum', 'TALEP_BEKLEYEN');

    if (error || !data) return { total: 0, bySource: {} };

    const bySource: Record<string, number> = {};
    data.forEach(r => {
        const src = r.basvuru_kanali || 'Diğer';
        bySource[src] = (bySource[src] || 0) + 1;
    });

    return { total: data.length, bySource };
}


// --- PRIORITY LOCKING (BUCKET STRATEGY) ---

export async function lockNextLead(userEmail: string): Promise<(Customer & { source?: string }) | null> {
    const nowISO = new Date().toISOString();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Parallel Fetch from Buckets

    // 1. Scheduled (Ready)
    const pBucketSched = supabaseAdmin.from('leads').select('*').is('sahip_email', null)
        .eq('durum', 'Daha sonra aranmak istiyor')
        .lte('sonraki_arama_zamani', nowISO)
        .limit(1);

    // 2. PRIORITY HOT LEADS (E-Devlet, Aranma Talebi) - Source Based
    // We explicitly look for these sources in the 'Yeni' pool (or null status)
    const pBucketHot = supabaseAdmin.from('leads').select('*').is('sahip_email', null)
        .or('durum.eq.Yeni,durum.is.null,durum.eq.""')
        .or('basvuru_kanali.eq.E-Devlet,basvuru_kanali.eq.Aranma Talebi')
        .order('created_at', { ascending: false }) // Newest first for hot leads
        .limit(1);

    // 3. Automation / General Pool (Everything else)
    const pBucketAuto = supabaseAdmin.from('leads').select('*').is('sahip_email', null)
        .or('durum.eq.Yeni,durum.is.null,durum.eq.""')
        .not('basvuru_kanali', 'in', '("E-Devlet","Aranma Talebi")') // Exclude hot ones to avoid double dipping (though order handles it, explicit is better)
        .order('created_at', { ascending: false })
        .limit(1);

    // 4. Retry (Ready)
    const pBucketRetry = supabaseAdmin.from('leads').select('*').is('sahip_email', null)
        .in('durum', retryStates)
        .limit(10);

    const [resSched, resHot, resAuto, resRetry] = await Promise.all([pBucketSched, pBucketHot, pBucketAuto, pBucketRetry]);

    let target: any = null;
    let source = '';

    // PRIORITY LOGIC
    // 1. Scheduled (Must be called on time)
    if (resSched.data && resSched.data.length > 0) {
        target = resSched.data[0];
        source = '📅 Randevu';
    }

    // 2. Hot Leads (E-Devlet / Aranma Talebi)
    if (!target && resHot.data && resHot.data.length > 0) {
        target = resHot.data[0];
        const channel = target.basvuru_kanali;
        if (channel === 'E-Devlet') source = '🔥 E-Devlet Veren';
        else if (channel === 'Aranma Talebi') source = '📢 Aranma Talebi';
        else source = '🔥 Öncelikli Kayıt';
    }

    // 3. General New / Automation
    if (!target) {
        const autoLeads = resAuto.data || [];
        const emptyLead = autoLeads.find((l: any) => !l.durum || l.durum === '');
        const newLead = autoLeads.find((l: any) => l.durum === 'Yeni');

        if (emptyLead) {
            target = emptyLead;
            source = '🤖 Otomasyon';
        } else if (newLead) {
            target = newLead;
            source = '🆕 Yeni Kayıt';
        }
    }

    // 4. Retry (Warm leads)
    if (!target && resRetry.data && resRetry.data.length > 0) {
        const nowTime = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const safetyBufferMs = 15 * 60 * 1000;

        const validRetry = resRetry.data.find((c: any) => {
            if (!c.son_arama_zamani) return true;
            const diff = nowTime - new Date(c.son_arama_zamani).getTime();
            return diff < oneDayMs && diff > safetyBufferMs;
        });

        if (validRetry) {
            target = validRetry;
            source = '♻️ Tekrar Arama (Son 24s)';
        }
    }

    if (!target) return null;

    // ATOMIC LOCK
    const { data: locked, error } = await supabaseAdmin.from('leads')
        .update({ sahip_email: userEmail, durum: 'Aranacak', updated_at: nowISO })
        .eq('id', target.id).is('sahip_email', null).select().single();

    if (error || !locked) {
        return null; // Concurrency miss
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


// --- REPORTING (BULK DATA) ---

// UPDATED: Accepts Date Range to avoid full table scan
export async function getReportData(startDate?: string, endDate?: string) {
    // Strategy: Only fetch leads that were UPDATED in this range.
    // Efficiently covers: New leads, status changes, sales, calls (assuming they update updated_at)

    let allRows: any[] = [];
    let page = 0;
    const pageSize = 1000;



    while (true) {
        let query = supabaseAdmin
            .from('leads')
            .select('id, durum, sehir, meslek_is, maas_bilgisi, talep_edilen_urun, onay_durumu, basvuru_kanali, created_at, son_arama_zamani, sahip_email, onay_tarihi, kredi_limiti, sonraki_arama_zamani, icra_durumu, dava_durumu, aciklama_uzun, avukat_sorgu_durumu, avukat_sorgu_sonuc, psikoteknik_varmi, psikoteknik_notu, ikametgah_varmi, hizmet_dokumu_varmi, ayni_isyerinde_sure_ay, mulkiyet_durumu, arac_varmi, arac_detay, tapu_varmi, tapu_detay, kapali_icra_kapanis_sekli, gizli_dosya_varmi, gizli_dosya_detay, kefil_meslek_is, kefil_son_yatan_maas, kefil_ayni_isyerinde_sure_ay, kefil_e_devlet_sifre, kefil_ikametgah_varmi, kefil_hizmet_dokumu_varmi, kefil_dava_dosyasi_varmi, kefil_dava_detay, kefil_acik_icra_varmi, kefil_acik_icra_detay, kefil_kapali_icra_varmi, kefil_kapali_icra_kapanis_sekli, kefil_mulkiyet_durumu, kefil_arac_varmi, kefil_tapu_varmi, kefil_notlar, winner_musteri_no, e_devlet_sifre, iptal_nedeni, kefil_ad_soyad, kefil_telefon, kefil_tc_kimlik, teslim_tarihi, teslim_eden, urun_imei, urun_seri_no, satilan_urunler, updated_at') // Added updated_at

        if (startDate && endDate) {
            // Safe superset: Any lead relevant to the report period MUST have been updated (or created) in that period.
            // We use a buffer of 1 day to be safe? No, updated_at is reliable.
            // BUT: 'start' passed from API is usually 00:00. 
            query = query.gte('updated_at', startDate).lte('updated_at', endDate + 'T23:59:59');
        }

        const { data, error } = await query
            .order('id', { ascending: true }) // Stable ordering for pagination
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Report fetch error:', error);
            break;
        }
        if (!data || data.length === 0) break;

        allRows = allRows.concat(data);
        if (data.length < pageSize) break;
        page++;
    }

    return allRows.map(mapRowToCustomer);
}

export async function getAllLogs(dateFilter?: string, startDate?: string, endDate?: string) {
    // Fetch logs for performance reports (Pace, Call Counts)
    let allLogs: any[] = [];
    let page = 0;
    const pageSize = 1000;

    // Build base query function
    const fetchPage = async (p: number) => {
        let query = supabaseAdmin.from('activity_logs').select('id, created_at, user_email, lead_id, action, new_value, old_value, note');

        if (dateFilter) {
            query = query.ilike('created_at', `${dateFilter}%`);
        } else if (startDate && endDate) {
            query = query.gte('created_at', startDate).lte('created_at', endDate + 'T23:59:59');
        }

        // No arbitrary limit, use pagination to get everything
        return query
            .order('created_at', { ascending: false })
            .range(p * pageSize, (p + 1) * pageSize - 1);
    };

    while (true) {
        const { data, error } = await fetchPage(page);

        if (error) {
            console.error('Logs fetch error:', error);
            break;
        }
        if (!data || data.length === 0) break;

        allLogs = allLogs.concat(data);
        if (data.length < pageSize) break;
        page++;
    }

    return allLogs.map(row => ({
        log_id: row.id,
        timestamp: row.created_at,
        user_email: row.user_email,
        customer_id: row.lead_id,
        action: row.action,
        new_value: row.new_value,
        old_value: row.old_value,
        note: row.note
    }));
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
        dogum_tarihi: customer.dogum_tarihi, // Added
        email: customer.email,
        durum: customer.durum,
        onay_durumu: customer.onay_durumu,
        // OWNERSHIP LOGIC:
        // 1. If status is 'Risk' (Dead lead), release ownership.
        // 2. If valid status AND currently unowned (or System), assign to current user.
        // 3. Prevent 'System' ownership unless explicitly set (which we avoid here).
        sahip_email: riskStatus.includes(customer.durum)
            ? null
            : (
                (!customer.sahip || ['sistem', 'system'].some(s => (customer.sahip || '').toLowerCase().includes(s))) &&
                    !['Aranacak', 'Ulaşılamadı', 'Meşgul', 'Cevap Yok', 'Meşgul/Hattı kapalı'].includes(customer.durum)
                    ? userEmail
                    : (customer.sahip || userEmail) // Fallback to existing or claim if null
            ),
        sehir: customer.sehir,
        ilce: customer.ilce,
        meslek_is: customer.meslek_is,
        maas_bilgisi: customer.son_yatan_maas,
        maas_1: customer.maas_1,
        maas_2: customer.maas_2,
        maas_3: customer.maas_3,
        maas_4: customer.maas_4,
        maas_5: customer.maas_5,
        maas_6: customer.maas_6,
        maas_ortalama: customer.maas_ortalama,
        kredi_limiti: customer.kredi_limiti,
        admin_notu: customer.admin_notu,
        arama_notu: customer.arama_not_kisa,
        aciklama_uzun: customer.aciklama_uzun,
        basvuru_kanali: customer.basvuru_kanali,
        talep_edilen_urun: customer.talep_edilen_urun,
        talep_edilen_tutar: customer.talep_edilen_tutar,
        renk: customer.renk,
        taksit_sayisi: customer.taksit_sayisi,
        // New Financial & VIP Fields
        ozel_musteri_mi: customer.ozel_musteri_mi,
        calisma_sekli: customer.calisma_sekli,
        ek_gelir: customer.ek_gelir,
        findeks_risk_durumu: customer.findeks_risk_durumu,
        finansal_notlar: customer.finansal_notlar,
        sonraki_arama_zamani: customer.sonraki_arama_zamani || null,
        son_arama_zamani: customer.son_arama_zamani || null,

        // Legal & Assets
        icra_durumu: {
            acik_icra: customer.acik_icra_varmi,
            kapali_icra: customer.kapali_icra_varmi,
            detay: customer.acik_icra_detay
        },
        dava_durumu: { varmi: customer.dava_dosyasi_varmi, detay: customer.dava_detay },
        kapali_icra_kapanis_sekli: customer.kapali_icra_kapanis_sekli,
        gizli_dosya_varmi: customer.gizli_dosya_varmi,
        gizli_dosya_detay: customer.gizli_dosya_detay,
        mulkiyet_durumu: customer.mulkiyet_durumu,
        arac_varmi: customer.arac_varmi,
        arac_detay: customer.arac_detay,
        tapu_varmi: customer.tapu_varmi,
        tapu_detay: customer.tapu_detay,

        // Work & Docs
        ayni_isyerinde_sure_ay: customer.ayni_isyerinde_sure_ay,
        psikoteknik_varmi: customer.psikoteknik_varmi,
        psikoteknik_notu: customer.psikoteknik_notu,
        ikametgah_varmi: customer.ikametgah_varmi,
        hizmet_dokumu_varmi: customer.hizmet_dokumu_varmi,

        // Attorney Check
        avukat_sorgu_durumu: customer.avukat_sorgu_durumu,
        avukat_sorgu_sonuc: customer.avukat_sorgu_sonuc,
        ev_adresi: customer.ev_adresi,
        is_adresi: customer.is_adresi,
        is_yeri_unvani: customer.is_yeri_unvani,
        is_yeri_bilgisi: customer.is_yeri_bilgisi,
        meslek: customer.meslek,

        // Main Extras
        winner_musteri_no: customer.winner_musteri_no,
        e_devlet_sifre: customer.e_devlet_sifre,
        iptal_nedeni: customer.iptal_nedeni,

        // Guarantor (Kefil) Full Profile
        kefil_ad_soyad: customer.kefil_ad_soyad,
        kefil_telefon: customer.kefil_telefon,
        kefil_tc_kimlik: customer.kefil_tc_kimlik,
        kefil_meslek_is: customer.kefil_meslek_is,
        kefil_son_yatan_maas: customer.kefil_son_yatan_maas,
        kefil_ayni_isyerinde_sure_ay: customer.kefil_ayni_isyerinde_sure_ay,
        kefil_e_devlet_sifre: customer.kefil_e_devlet_sifre,
        kefil_ikametgah_varmi: customer.kefil_ikametgah_varmi,
        kefil_hizmet_dokumu_varmi: customer.kefil_hizmet_dokumu_varmi,
        kefil_dava_dosyasi_varmi: customer.kefil_dava_dosyasi_varmi,
        kefil_dava_detay: customer.kefil_dava_detay,
        kefil_acik_icra_varmi: customer.kefil_acik_icra_varmi,
        kefil_acik_icra_detay: customer.kefil_acik_icra_detay,
        kefil_kapali_icra_varmi: customer.kefil_kapali_icra_varmi,
        kefil_kapali_icra_kapanis_sekli: customer.kefil_kapali_icra_kapanis_sekli,
        kefil_mulkiyet_durumu: customer.kefil_mulkiyet_durumu,
        kefil_arac_varmi: customer.kefil_arac_varmi,
        kefil_tapu_varmi: customer.kefil_tapu_varmi,
        kefil_tapu_detay: customer.kefil_tapu_detay,
        kefil_arac_detay: customer.kefil_arac_detay,
        kefil_avukat_sorgu_durumu: customer.kefil_avukat_sorgu_durumu,
        kefil_avukat_sorgu_sonuc: customer.kefil_avukat_sorgu_sonuc,
        kefil_notlar: customer.kefil_notlar,

        // Delivery
        teslim_tarihi: customer.teslim_tarihi || null,
        onay_tarihi: customer.onay_tarihi || null, // Add this line
        teslim_eden: customer.teslim_eden,
        urun_imei: customer.urun_imei,
        urun_seri_no: customer.urun_seri_no,
        gorsel_1_url: customer.gorsel_1_url,
        gorsel_2_url: customer.gorsel_2_url,
        satilan_urunler: typeof customer.satilan_urunler === 'object' ? JSON.stringify(customer.satilan_urunler) : customer.satilan_urunler,

        // Product Details
        marka: customer.marka,
        model: customer.model,
        satis_tarihi: customer.satis_tarihi || null,
        kargo_takip_no: customer.kargo_takip_no,

        // Collection Module
        sinif: customer.sinif,
        tahsilat_durumu: customer.tahsilat_durumu,
        odeme_sozu_tarihi: customer.odeme_sozu_tarihi
    };


    // 1. Fetch CURRENT data effectively for diff
    // We already do a select at the end, but we need the OLD values for logging.
    // The calling function likely has it, BUT to be safe and atomic, let's fetch here or rely on the fact we build the 'updates' object.

    // Actually, 'updateLead' receives the 'customer' object which is the NEW state. 
    // We need to fetch the OLD state to compare.
    const { data: oldData } = await supabaseAdmin.from('leads').select('*').eq('id', customer.id).single();

    if (oldData) {
        const changes: string[] = [];
        // Define fields to track
        const trackFields = [
            'ad_soyad', 'telefon', 'tc_kimlik', 'durum', 'kredi_limiti', 'sehir', 'ilce',
            'meslek_is', 'maas_bilgisi', 'aciklama_uzun', 'onay_durumu',
            'avukat_sorgu_durumu', 'kefil_ad_soyad', 'tahsilat_durumu', 'sinif',
            'teslim_tarihi', 'satis_tarihi', 'odeme_sozu_tarihi'
        ];

        trackFields.forEach(field => {
            // Loose comparison for strings/numbers
            const oldVal = String(oldData[field] || '').trim();
            // @ts-ignore
            const newVal = String(updates[field] || '').trim();

            if (oldVal !== newVal) {
                // Ignore empty to null transitions if both effectively empty
                if (!oldVal && !newVal) return;
                changes.push(`${field}: "${oldVal}" -> "${newVal}"`);
            }
        });

        // Log if there are changes (Exclude Status Change as it's often logged separately or we can double log for detail)
        // We filter out 'durum' if we only want generic fields, but user asked for "everything".
        if (changes.length > 0) {
            await logAction({
                log_id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                user_email: userEmail,
                customer_id: customer.id,
                action: 'UPDATE_FIELDS',
                old_value: 'Detailed Log',
                new_value: `${changes.length} fields changed`,
                note: changes.join('\n')
            });
        }
    }

    const { data, error } = await supabaseAdmin.from('leads').update(updates).eq('id', customer.id).select().single();
    if (error) throw error;
    return mapRowToCustomer(data);
}

export async function addLead(customer: Partial<Customer>, userEmail: string): Promise<Customer> {
    // 1. Global Duplicate Check
    if (customer.telefon) {
        const { data: existing } = await supabaseAdmin
            .from('leads')
            .select('id, ad_soyad')
            .eq('telefon', customer.telefon)
            .single();

        if (existing) {
            throw new Error(`Bu telefon numarası (${customer.telefon}) zaten kayıtlı! (${existing.ad_soyad})`);
        }
    }

    const dbRow = {
        ad_soyad: customer.ad_soyad,
        telefon: customer.telefon,
        tc_kimlik: customer.tc_kimlik,
        durum: customer.durum || 'Yeni',
        basvuru_kanali: customer.basvuru_kanali || 'Panel', // Allow passing source
        sahip_email: customer.sahip === null ? null : (customer.sahip || userEmail),
        created_at: new Date().toISOString(),
        ozel_musteri_mi: customer.ozel_musteri_mi || false, // Support priority flag
        e_devlet_sifre: customer.e_devlet_sifre, // Map E-Devlet password
        aciklama_uzun: customer.aciklama_uzun,
        sinif: customer.sinif || 'Normal',
        tahsilat_durumu: customer.tahsilat_durumu,
        taksit_sayisi: customer.taksit_sayisi
    };
    const { data, error } = await supabaseAdmin.from('leads').insert(dbRow).select().single();
    if (error) throw error;
    return mapRowToCustomer(data);
}

export async function deleteCustomer(id: string, userEmail: string) {
    // 1. Unlink Inventory (Set musteri_id to null for items owned by this lead)
    await supabaseAdmin.from('inventory').update({ musteri_id: null, durum: 'STOKTA' }).eq('musteri_id', id); // Logic choice: If we delete customer, maybe item returns to stock? Or just unlink? 
    // Actually, if a lead is deleted, it's likely a mistake/duplicate. If they BOUGHT something, we should probably keep it sold? 
    // Safest: Just unlink.
    // Better yet: Just delete logs. Inventory FK might be SET NULL or NO ACTION.
    // Let's delete logs usually the headers.
    await supabaseAdmin.from('activity_logs').delete().eq('lead_id', id);

    // 2. Delete Lead
    const { error } = await supabaseAdmin.from('leads').delete().eq('id', id);
    if (error) throw error;

    // Log
    await logAction({ log_id: crypto.randomUUID(), timestamp: new Date().toISOString(), user_email: userEmail, customer_id: id, action: 'UPDATE_STATUS', old_value: 'Active', new_value: 'DELETED', note: `Deleted by ${userEmail}` });
}

export async function logAction(entry: LogEntry) {
    await supabaseAdmin.from('activity_logs').insert({
        id: entry.log_id,
        user_email: entry.user_email,
        lead_id: entry.customer_id,
        action: entry.action,
        old_value: entry.old_value,
        new_value: entry.new_value,
        note: entry.note,
        metadata: entry.metadata
    });
}

export async function getLogs(customerId?: string): Promise<LogEntry[]> {
    let query = supabaseAdmin.from('activity_logs').select('*');
    if (customerId) query = query.eq('lead_id', customerId);
    const { data } = await query.order('created_at', { ascending: false }).limit(200);
    return (data || []).map(row => ({ log_id: row.id, timestamp: row.created_at, user_email: row.user_email, customer_id: row.lead_id, action: row.action, old_value: row.old_value, new_value: row.new_value, note: row.note }));
}

export async function getRecentLogs(limit: number = 50, sinceMinutes?: number): Promise<LogEntry[]> {
    let query = supabaseAdmin.from('activity_logs').select('*').order('created_at', { ascending: false });

    if (sinceMinutes) {
        const timeThreshold = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();
        query = query.gte('created_at', timeThreshold);
        // If time filtered, increase limit to capture all events in that window
        limit = 1000;
    }

    const { data } = await query.limit(limit);
    return (data || []).map(row => ({ log_id: row.id, timestamp: row.created_at, user_email: row.user_email, customer_id: row.lead_id, action: row.action, old_value: row.old_value, new_value: row.new_value, note: row.note }));
}

export async function getInventoryStats() {
    const { data, error } = await supabaseAdmin
        .from('inventory')
        .select('alis_fiyati, fiyat_15_taksit')
        .eq('durum', 'STOKTA');

    if (error) {
        console.error('Inventory Stats Error:', error);
        return { totalItems: 0, totalCost: 0, totalRevenue: 0 };
    }

    let totalItems = 0;
    let totalCost = 0;
    let totalRevenue = 0;

    data.forEach((item: any) => {
        totalItems++;
        totalCost += Number(item.alis_fiyati || 0);
        totalRevenue += Number(item.fiyat_15_taksit || 0);
    });

    return { totalItems, totalCost, totalRevenue };
}

export function mapRowToCustomer(row: any): Customer {
    return {
        id: row.id, created_at: row.created_at, created_by: row.created_by, ad_soyad: row.ad_soyad, telefon: row.telefon, tc_kimlik: row.tc_kimlik, email: row.email, dogum_tarihi: row.dogum_tarihi, durum: row.durum, sahip: row.sahip_email, sehir: row.sehir, ilce: row.ilce, meslek_is: row.meslek_is,

        // JSONB Fields (Legacy support + new structure)
        son_yatan_maas: row.maas_bilgisi,
        maas_1: row.maas_1,
        maas_2: row.maas_2,
        maas_3: row.maas_3,
        maas_4: row.maas_4,
        maas_5: row.maas_5,
        maas_6: row.maas_6,
        maas_ortalama: row.maas_ortalama,
        acik_icra_varmi: row.icra_durumu?.acik_icra,
        kapali_icra_varmi: row.icra_durumu?.kapali_icra,
        acik_icra_detay: row.icra_durumu?.detay,
        dava_dosyasi_varmi: row.dava_durumu?.varmi,
        dava_detay: row.dava_durumu?.detay,

        admin_notu: row.admin_notu, arama_not_kisa: row.arama_notu, basvuru_kanali: row.basvuru_kanali, talep_edilen_urun: row.talep_edilen_urun, talep_edilen_tutar: row.talep_edilen_tutar, onay_durumu: row.onay_durumu, sonraki_arama_zamani: row.sonraki_arama_zamani, son_arama_zamani: row.son_arama_zamani, kilitli_mi: false,
        winner_musteri_no: row.winner_musteri_no, e_devlet_sifre: row.e_devlet_sifre, iptal_nedeni: row.iptal_nedeni, kefil_ad_soyad: row.kefil_ad_soyad, kefil_telefon: row.kefil_telefon, kefil_tc_kimlik: row.kefil_tc_kimlik, teslim_tarihi: row.teslim_tarihi, teslim_eden: row.teslim_eden, urun_imei: row.urun_imei, urun_seri_no: row.urun_seri_no, satilan_urunler: typeof row.satilan_urunler === 'object' ? JSON.stringify(row.satilan_urunler) : row.satilan_urunler,

        // NEW FIELDS MAPPING
        aciklama_uzun: row.aciklama_uzun,
        avukat_sorgu_durumu: row.avukat_sorgu_durumu,
        avukat_sorgu_sonuc: row.avukat_sorgu_sonuc,
        odeme_sozu_tarihi: row.odeme_sozu_tarihi,
        psikoteknik_varmi: row.psikoteknik_varmi,
        psikoteknik_notu: row.psikoteknik_notu,
        ikametgah_varmi: row.ikametgah_varmi,
        hizmet_dokumu_varmi: row.hizmet_dokumu_varmi,
        ayni_isyerinde_sure_ay: row.ayni_isyerinde_sure_ay,
        mulkiyet_durumu: row.mulkiyet_durumu,
        arac_varmi: row.arac_varmi,
        arac_detay: row.arac_detay,
        tapu_varmi: row.tapu_varmi,
        tapu_detay: row.tapu_detay,
        kapali_icra_kapanis_sekli: row.kapali_icra_kapanis_sekli,
        gizli_dosya_varmi: row.gizli_dosya_varmi,
        gizli_dosya_detay: row.gizli_dosya_detay,

        // Guarantor
        kefil_meslek_is: row.kefil_meslek_is,
        kefil_son_yatan_maas: row.kefil_son_yatan_maas,
        kefil_ayni_isyerinde_sure_ay: row.kefil_ayni_isyerinde_sure_ay,
        kefil_e_devlet_sifre: row.kefil_e_devlet_sifre,
        kefil_ikametgah_varmi: row.kefil_ikametgah_varmi,
        kefil_hizmet_dokumu_varmi: row.kefil_hizmet_dokumu_varmi,
        kefil_dava_dosyasi_varmi: row.kefil_dava_dosyasi_varmi,
        kefil_dava_detay: row.kefil_dava_detay,
        kefil_acik_icra_varmi: row.kefil_acik_icra_varmi,
        kefil_acik_icra_detay: row.kefil_acik_icra_detay,
        kefil_kapali_icra_varmi: row.kefil_kapali_icra_varmi,
        kefil_kapali_icra_kapanis_sekli: row.kefil_kapali_icra_kapanis_sekli,
        kefil_mulkiyet_durumu: row.kefil_mulkiyet_durumu,
        kefil_arac_varmi: row.kefil_arac_varmi,
        kefil_tapu_varmi: row.kefil_tapu_varmi,
        kefil_tapu_detay: row.kefil_tapu_detay,
        kefil_arac_detay: row.kefil_arac_detay,
        kefil_avukat_sorgu_durumu: row.kefil_avukat_sorgu_durumu,
        kefil_avukat_sorgu_sonuc: row.kefil_avukat_sorgu_sonuc,
        kefil_notlar: row.kefil_notlar,
        ev_adresi: row.ev_adresi,
        is_adresi: row.is_adresi,
        is_yeri_unvani: row.is_yeri_unvani,
        is_yeri_bilgisi: row.is_yeri_bilgisi,
        meslek: row.meslek,
        telefon_onayli: row.telefon_onayli,

        ...row
    };
}
