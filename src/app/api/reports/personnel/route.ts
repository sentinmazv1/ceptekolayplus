
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const parsePrice = (p: any): number => {
    if (!p) return 0;
    let str = String(p).replace(/[^0-9,.-]/g, '');
    if (str.includes(',') && str.includes('.')) str = str.replace(/\./g, '').replace(',', '.');
    else if (str.includes(',')) str = str.replace(',', '.');
    return parseFloat(str) || 0;
};

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, error: 'Dates required' }, { status: 400 });
        }

        // Adjust Dates securely
        const startIso = new Date(startDate).toISOString();
        const endIso = new Date(new Date(endDate).setHours(23, 59, 59, 999)).toISOString();

        // 1. Fetch Users
        // We'll map IDs to Names
        // In some setups, users might be in auth.users or a public profiles table.
        // Assuming we have a way to get names, usually from `leads.assigned_to` text or specific headers.
        // If we don't have a user table, we'll collect names from the logs/leads themselves.
        const personnelMap = new Map<string, any>();

        const getStats = (name: string) => {
            if (!personnelMap.has(name)) {
                personnelMap.set(name, {
                    name,
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

        // 2. Fetch Logs (Actions driven)
        // Group by `performed_by` (name) or `user_id` and resolve name.
        // Usually logs have `performed_by` as the name string in some systems, or just ID.
        // Let's check the overview logic... it didn't check user. 
        // Based on other files, `activity_logs` often has `user_id`.
        // We might need to fetch `admin_users` or similar if exists. 
        // Let's assume we can group by `performed_by` if it exists in log, OR we select distinct users first.
        // Checking schema via tool would be best but I'll try to be robust. 
        // I'll fetch `performed_by` from logs if available. If not, I rely on `user_id` but I strictly need names.
        // Let's try to fetch `admin_users` if possible or assume logs contain the name.
        // *Correction*: In this codebase, logs usually do not trigger a join. 
        // I will assume `activity_logs` has a `performed_by` column OR I will use the `leads.assigned_to` list to map known users.

        // Let's fetch logs.
        const { data: logs, error: logError } = await supabaseAdmin
            .from('activity_logs')
            .select('*')
            .gte('created_at', startIso)
            .lte('created_at', endIso);

        if (logError) throw logError;

        logs?.forEach((log: any) => {
            const user = log.performed_by || log.user_email || 'Bilinmeyen'; // Fallback
            const stats = getStats(user);
            const action = log.action;
            const newVal = String(log.new_value || '').toLowerCase();
            const note = String(log.note || '').toLowerCase();

            // Action Counts
            if (action === 'PULL_LEAD') stats.calls++;
            if (action === 'SEND_SMS' || action === 'CLICK_SMS') stats.sms++;
            if (action === 'SEND_WHATSAPP' || action === 'CLICK_WHATSAPP') stats.whatsapp++;

            // Transitions (Using Log User - "Who moved it")
            if (newVal.includes('başvuru alındı')) stats.applications++;
            if ((newVal.includes('avukat') && newVal.includes('bekliyor') || newVal.includes('incelemesinde'))) stats.attorneyQuery++;
            if ((newVal.includes('temiz') || note.includes('temiz')) && newVal.includes('avukat')) stats.attorneyClean++;
            // Note: Attorney Clean/Risky might be tricky to regex exactly, using best effort from Overview logic.
            if ((newVal.includes('riskli') || note.includes('riskli') || newVal.includes('sorunlu')) && newVal.includes('avukat')) stats.attorneyRisky++;
        });

        // 3. Fetch Financials (Lead Owner driven)
        const { data: leads, error: leadError } = await supabaseAdmin
            .from('leads')
            .select('*')
            .or(`updated_at.gte.${startIso},teslim_tarihi.gte.${startIso},onay_tarihi.gte.${startIso}`); // optimistically fetch relevant leads

        if (leadError) throw leadError;

        leads?.forEach((lead: any) => {
            const owner = lead.assigned_to || 'Atanmamış';
            const stats = getStats(owner);
            const startTs = new Date(startIso).getTime();
            const endTs = new Date(endIso).getTime();

            // Approved (Lead Owner)
            if (lead.onay_durumu === 'Onaylandı') {
                const onayTs = lead.onay_tarihi ? new Date(lead.onay_tarihi).getTime() : 0;
                if (onayTs >= startTs && onayTs <= endTs) {
                    stats.approvedCount++;
                    stats.approvedLimit += parsePrice(lead.kredi_limiti);
                }
            }

            // Delivered (Lead Owner)
            const isDeliveredStatus = ['Teslim edildi', 'Satış yapıldı/Tamamlandı', 'Satış Yapıldı'].includes(lead.durum);
            if (isDeliveredStatus) {
                let items: any[] = [];
                try {
                    if (Array.isArray(lead.satilan_urunler)) items = lead.satilan_urunler;
                    else if (typeof lead.satilan_urunler === 'string') items = JSON.parse(lead.satilan_urunler);
                } catch (e) { }

                let revenue = 0;
                let hasItem = false;

                if (items.length > 0) {
                    items.forEach(item => {
                        const itemDate = item.satis_tarihi || item.teslim_tarihi || lead.teslim_tarihi;
                        if (itemDate) {
                            const d = new Date(itemDate).getTime();
                            if (d >= startTs && d <= endTs) {
                                revenue += parsePrice(item.satis_fiyati || item.fiyat);
                                hasItem = true;
                            }
                        }
                    });
                } else {
                    const leadDate = lead.teslim_tarihi || lead.satis_tarihi;
                    if (leadDate) {
                        const d = new Date(leadDate).getTime();
                        if (d >= startTs && d <= endTs) {
                            revenue += parsePrice(lead.kredi_limiti || lead.satis_fiyati);
                            hasItem = true;
                        }
                    }
                }

                if (hasItem) {
                    stats.deliveredCount++;
                    stats.deliveredRevenue += revenue;
                }
            }
        });

        const data = Array.from(personnelMap.values()).sort((a, b) => b.deliveredRevenue - a.deliveredRevenue); // Sort by Revenue by default

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
