
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Helper for price parsing (matching legacy)
const parsePrice = (p: any): number => {
    if (!p) return 0;
    let str = String(p).replace(/[^0-9,.-]/g, '');
    if (str.includes(',') && str.includes('.')) str = str.replace(/\./g, '').replace(',', '.');
    else if (str.includes(',')) str = str.replace(',', '.');
    return parseFloat(str) || 0;
};

// Helper for User Normalization (matching legacy)
const normalizeUser = (u: string) => {
    if (!u) return 'Atanmamış';
    let norm = u.toLowerCase().trim();
    if (norm === 'funda') return 'funda@ceptekolayplus.com';
    if (norm === 'gözde' || norm === 'gozde') return 'gozde@ceptekolayplus.com';
    return norm; // Keep email format
};

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, error: 'Dates required' }, { status: 400 });
        }

        const startIso = new Date(startDate).toISOString();
        const endIso = new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString();
        const startTs = new Date(startIso).getTime();
        const endTs = new Date(endIso).getTime();

        const personnelMap = new Map<string, any>();
        const getStats = (name: string) => {
            // If normalized name is email, we might want to display a cleaner name, 
            // but for grouping, use the normalized key.
            if (!personnelMap.has(name)) {
                personnelMap.set(name, {
                    name: name,
                    calls: 0,
                    sms: 0,
                    whatsapp: 0,
                    applications: 0,
                    attorneyQuery: 0,
                    attorneyClean: 0,
                    attorneyRisky: 0,
                    approvedCount: 0,
                    approvedLimit: 0,
                    deliveredCount: 0,
                    deliveredRevenue: 0
                });
            }
            return personnelMap.get(name);
        };

        // --- 1. LOGS (For Activity Counts) ---
        const { data: rangeLogs } = await supabaseAdmin
            .from('activity_logs')
            .select('*')
            .gte('created_at', startIso)
            .lte('created_at', endIso);

        // --- 1.5 ATTORNEY HISTORY (New Source of Truth) ---
        // Fetch attorney history records
        const { data: attorneyHistory, error: attorneyError } = await supabaseAdmin
            .from('attorney_status_history')
            .select('*')
            .gte('created_at', startIso)
            .lte('created_at', endIso);

        if (attorneyError) {
            console.error('Attorney history query error:', attorneyError);
        }
        console.log('Attorney history records fetched:', attorneyHistory?.length);

        // Fetch all leads to get owner information
        // Only fetch leads that are in attorney history to avoid Supabase limit issues
        const leadIds = [...new Set(attorneyHistory?.map((r: any) => r.lead_id).filter(Boolean) || [])];

        const { data: allLeads } = await supabaseAdmin
            .from('leads')
            .select('id, sahip_email')
            .in('id', leadIds.length > 0 ? leadIds : ['']); // Avoid empty array error

        // Create a map of lead_id -> owner
        const leadOwnerMap = new Map<string, string>();
        allLeads?.forEach((lead: any) => {
            const owner = lead.sahip_email;
            if (owner) {
                leadOwnerMap.set(lead.id, owner);
            }
        });
        console.log('Lead owner map created, size:', leadOwnerMap.size);


        rangeLogs?.forEach((log: any) => {
            const rawUser = log.user_email;
            if (!rawUser) return;
            // Filter ignorable users (MATCHING LEGACY)
            if (['sistem', 'system', 'admin', 'ibrahim', 'ibrahimsentinmaz@gmail.com'].some(x => rawUser.toLowerCase().includes(x))) return;

            const user = normalizeUser(rawUser);
            const stats = getStats(user);
            const action = log.action;
            const newVal = String(log.new_value || '').toLowerCase();
            const note = String(log.note || '').toLowerCase();

            // MATCHING USER REQUEST: ONLY COUNT 'PULL_LEAD' (Müşteri Çek)
            if (action === 'PULL_LEAD') stats.calls++;
            if (action === 'SEND_SMS' || action === 'CLICK_SMS') stats.sms++;
            if (action === 'SEND_WHATSAPP' || action === 'CLICK_WHATSAPP') stats.whatsapp++;

            // Applications (Strict Trigger Statuses)
            const validAppStatuses = ['başvuru alındı', 'onaya gönderildi', 'onay bekleniyor', 'eksik evrak bekleniyor'];
            if ((action === 'UPDATE_STATUS' || action === 'CREATED') && validAppStatuses.some(s => newVal.includes(s))) {
                stats.applications++;
            }

            // Attorney
            // Attorney Stats are now handled separately below via 'attorneyHistory'
            // Removing old log parsing logic here to avoid double counting or inaccuracy.

        });



        // --- Process Attorney History ---
        // IMPORTANT: Attribute to LEAD OWNER, not the person who performed the query
        attorneyHistory?.forEach((record: any) => {
            const leadId = record.lead_id;
            if (!leadId) return;

            const ownerRaw = leadOwnerMap.get(leadId);
            if (!ownerRaw) return;

            // Filter ignorable users
            if (['sistem', 'system', 'admin', 'ibrahim', 'ibrahimsentinmaz@gmail.com'].some(x => ownerRaw.toLowerCase().includes(x))) return;

            const user = normalizeUser(ownerRaw);
            const stats = getStats(user);

            const status = record.new_status || '';

            // Use exact matching for attorney statuses
            if (status === 'Temiz') {
                stats.attorneyClean++;
            } else if (status === 'Riskli') {
                stats.attorneyRisky++;
            } else if (status === 'Sorgu Bekleniyor' || status === 'Kefil bekleniyor') {
                stats.attorneyQuery++;
            }
            // Ignore backfill records like "1 fields changed", "2 fields changed", etc.
        });

        // --- 2. LEADS (Financials) ---
        // Query approved leads separately with date filter
        const { data: approvedLeads } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('onay_durumu', 'Onaylandı')
            .gte('onay_tarihi', startIso)
            .lte('onay_tarihi', endIso);

        // Query delivered leads separately with date filter
        const { data: deliveredLeads } = await supabaseAdmin
            .from('leads')
            .select('*')
            .in('durum', ['Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Satış Yapıldı'])
            .gte('teslim_tarihi', startIso)
            .lte('teslim_tarihi', endIso);

        // Process approved leads
        approvedLeads?.forEach((lead: any) => {
            const ownerRaw = lead.sahip_email;
            if (!ownerRaw) return;
            if (['sistem', 'system', 'admin', 'ibrahim', 'ibrahimsentinmaz@gmail.com'].some(x => ownerRaw.toLowerCase().includes(x))) return;

            const user = normalizeUser(ownerRaw);
            const stats = getStats(user);

            stats.approvedCount++;
            stats.approvedLimit += parsePrice(lead.kredi_limiti);
        });

        // Process delivered leads
        deliveredLeads?.forEach((lead: any) => {
            const ownerRaw = lead.sahip_email;
            if (!ownerRaw) return;
            if (['sistem', 'system', 'admin', 'ibrahim', 'ibrahimsentinmaz@gmail.com'].some(x => ownerRaw.toLowerCase().includes(x))) return;

            const user = normalizeUser(ownerRaw);
            const stats = getStats(user);

            stats.deliveredCount++;
            // Use kredi_limiti for revenue (matching SQL query)
            stats.deliveredRevenue += parsePrice(lead.kredi_limiti);
        });

        // Final Filter & Sort
        const filteredData = Array.from(personnelMap.values())
            .sort((a: any, b: any) => b.deliveredRevenue - a.deliveredRevenue);

        return NextResponse.json({
            success: true,
            data: filteredData,
            debug: {
                attorneyHistoryCount: attorneyHistory?.length || 0,
                leadOwnerMapSize: leadOwnerMap.size,
                dateRange: { startIso, endIso }
            }
        });

    } catch (error: any) {
        console.error('Personnel report error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
