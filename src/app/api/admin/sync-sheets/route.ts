import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetData } from '@/lib/google-sheets';
import { addLead } from '@/lib/leads';
import { supabaseAdmin } from '@/lib/supabase';
import { Customer } from '@/lib/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Forced update to ensure Vercel picks up the new environment configuration
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        // Security Check: Only Admins
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const mode = body.mode || 'preview'; // 'preview' | 'confirm'

        // --- PREVIEW MODE ---
        if (mode === 'preview') {
            // 1. Fetch "Aranma Talepleri"
            const aramaRows = await fetchSheetData('Aranma Talepleri!A2:E');
            // 2. Fetch "E-Devlet Verenler"
            const edevletRows = await fetchSheetData('E-Devlet Verenler!A2:E');

            const allRows: any[] = [];

            // Standardize generic row mapper
            const mapRow = (row: any[], source: string, status: string) => {
                const name = row[1] ? String(row[1]).trim() : '';
                const phone = row[2] ? String(row[2]).replace(/\s/g, '') : '';
                const note = row[3] || '';

                if (!name || !phone || phone.length < 10) return null;

                return {
                    temp_id: crypto.randomUUID(),
                    ad_soyad: name,
                    telefon: phone,
                    basvuru_kanali: source,
                    aciklama_uzun: `Otomasyon ile eklendi. Kaynak: ${source}. Detay: ${note}`,
                    durum: status, // Dynamic Status
                    ozel_musteri_mi: true, // Auto-mark as Priority/Special
                    raw_data: row // Keep raw if needed
                };
            };

            // Process Aranma Talepleri
            if (aramaRows) {
                aramaRows.forEach(r => {
                    const mapped = mapRow(r, 'Aranma Talebi', 'Yeni');
                    if (mapped) allRows.push(mapped);
                });
            }

            // Process E-Devlet Verenler
            if (edevletRows) {
                edevletRows.forEach(r => {
                    const mapped = mapRow(r, 'E-Devlet', 'E-Devlet Veren'); // Correct Status Mapping
                    if (mapped) allRows.push(mapped);
                });
            }

            // Check Duplicates in DB
            // We can't query "IN (long_list)" easily if list is huge, but for reasonable batch sizes it's fine.
            const phones = allRows.map(r => r.telefon);

            const { data: existingLeads } = await supabaseAdmin
                .from('leads')
                .select('telefon')
                .in('telefon', phones);

            const existingPhones = new Set(existingLeads?.map(l => l.telefon) || []);

            // FILTER: Only show NON-EXISTING leads for import
            const newLeads = allRows.filter(row => !existingPhones.has(row.telefon));

            return NextResponse.json({
                success: true,
                mode: 'preview',
                data: newLeads, // Only send new ones
                count: newLeads.length,
                total_found: allRows.length,
                duplicates_skipped: allRows.length - newLeads.length
            });
        }

        // --- CONFIRM MODE ---
        if (mode === 'confirm') {
            const { leads } = body;
            if (!leads || !Array.isArray(leads)) {
                return NextResponse.json({ success: false, error: 'Invalid data' }, { status: 400 });
            }

            let addedCount = 0;
            let skippedCount = 0;

            for (const lead of leads) {
                try {
                    await addLead({
                        ad_soyad: lead.ad_soyad,
                        telefon: lead.telefon,
                        basvuru_kanali: lead.basvuru_kanali,
                        durum: lead.durum, // Use the status from preview (source-based)
                        aciklama_uzun: lead.aciklama_uzun,
                        ozel_musteri_mi: true, // Ensure priority tag
                        sahip: null
                    }, session.user.email || 'Admin Sync');
                    addedCount++;
                } catch (e) {
                    console.error('Import error for ' + lead.telefon, e);
                    skippedCount++;
                }
            }

            return NextResponse.json({
                success: true,
                mode: 'confirm',
                added: addedCount,
                skipped: skippedCount
            });
        }

        return NextResponse.json({ success: false, error: 'Invalid mode' }, { status: 400 });

    } catch (error: any) {
        console.error('Manual Sync Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
