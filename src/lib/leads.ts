
import { supabaseAdmin } from './supabase';
import { Customer, LeadStatus, LogEntry } from './types';

const retryStates = ['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok'];

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

    const pWaitRetry = retryQuery;

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


// --- REPORTING (BULK DATA) ---

export async function getReportData() {
    // Fetch only columns needed for reports to save bandwidth
    // Columns: durum, sehir, meslek_is, son_yatan_maas, talep_edilen_urun, onay_durumu, basvuru_kanali, created_at, son_arama_zamani, sahip, onay_tarihi
    // Note: Recursive fetch to ensure we get ALL data for reports.

    let allRows: any[] = [];
    let page = 0;
    const pageSize = 2000;

    while (true) {
        const { data, error } = await supabaseAdmin
            .from('leads')
            .select('id, durum, sehir, meslek_is, maas_bilgisi, talep_edilen_urun, onay_durumu, basvuru_kanali, created_at, son_arama_zamani, sahip_email, onay_tarihi, sonraki_arama_zamani, icra_durumu, dava_durumu')
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

export async function getAllLogs(dateFilter?: string) {
    // Fetch logs for performance reports (Pace, Call Counts)
    let query = supabaseAdmin.from('activity_logs').select('id, created_at, user_email, customer_id, action');

    if (dateFilter) {
        // Simple string match for YYYY-MM-DD
        query = query.ilike('created_at', `${dateFilter}%`);
    } else {
        // default limit if no date? or last 30 days? 
        // For 'Today's Report', we usually pass a date.
        // If no date, careful! 
        query = query.limit(5000).order('created_at', { ascending: false });
    }

    // pagination if needed, but for "Today" it usually fits in 5000
    const { data, error } = await query;
    if (error) return [];

    return (data || []).map(row => ({
        log_id: row.id,
        timestamp: row.created_at,
        user_email: row.user_email,
        customer_id: row.customer_id,
        action: row.action
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
        aciklama_uzun: customer.aciklama_uzun,
        basvuru_kanali: customer.basvuru_kanali,
        talep_edilen_urun: customer.talep_edilen_urun,
        talep_edilen_tutar: customer.talep_edilen_tutar,
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
        kefil_notlar: customer.kefil_notlar,

        // Delivery
        teslim_tarihi: customer.teslim_tarihi || null,
        teslim_eden: customer.teslim_eden,
        urun_imei: customer.urun_imei,
        urun_seri_no: customer.urun_seri_no,
        satilan_urunler: typeof customer.satilan_urunler === 'object' ? JSON.stringify(customer.satilan_urunler) : customer.satilan_urunler
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
        // Add basic defaults if needed, but 'update' usually handles details afterwards.
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
        id: row.id, created_at: row.created_at, created_by: row.created_by, ad_soyad: row.ad_soyad, telefon: row.telefon, tc_kimlik: row.tc_kimlik, email: row.email, dogum_tarihi: row.dogum_tarihi, durum: row.durum, sahip: row.sahip_email, sehir: row.sehir, ilce: row.ilce, meslek_is: row.meslek_is, son_yatan_maas: row.maas_bilgisi,

        // JSONB Fields (Legacy support + new structure)
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
        kefil_notlar: row.kefil_notlar,

        ...row
    };
}
