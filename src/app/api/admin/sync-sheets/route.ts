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
            const mapRow = (row: any[], source: string) => {
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
                    durum: 'Yeni',
                    raw_data: row // Keep raw if needed
                };
            };

            // Process Aranma Talepleri
            if (aramaRows) {
                aramaRows.forEach(r => {
                    const mapped = mapRow(r, 'Aranma Talebi');
                    if (mapped) allRows.push(mapped);
                });
            }

            // Process E-Devlet Verenler
            if (edevletRows) {
                edevletRows.forEach(r => {
                    const mapped = mapRow(r, 'E-Devlet');
                    if (mapped) allRows.push(mapped);
                });
            }

            // Check Duplicates in DB
            // We can't query "IN (long_list)" easily if list is huge, but for reasonable batch sizes it's fine.
            // If > 1000, maybe do chunks. Assuming < 1000 daily.
            const phones = allRows.map(r => r.telefon);

            const { data: existingLeads } = await supabaseAdmin
                .from('leads')
                .select('telefon')
                .in('telefon', phones);

            const existingPhones = new Set(existingLeads?.map(l => l.telefon) || []);

            const previewData = allRows.map(row => ({
                ...row,
                exists: existingPhones.has(row.telefon)
            }));

            // Filter out existing ones? Or just mark them? User wants "control".
            // Let's sort: New ones first.
            previewData.sort((a, b) => {
                if (a.exists === b.exists) return 0;
                return a.exists ? 1 : -1;
            });

            return NextResponse.json({
                success: true,
                mode: 'preview',
                data: previewData,
                count: previewData.length,
                new_count: previewData.filter(x => !x.exists).length
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
                // Secondary check for safety (optional but good)
                // We rely on the Frontend sending filtered list, but addLead might not dedup if not careful.
                // Note: we can't easily check dedup inside the loop efficiently without causing N+1 queries 
                // unless we trust the frontend selection.
                // We'll trust the selector for speed, or addLead handles constraints?
                // addLead does a simple insert. Supabase *might* throw error if UNIQUE constraint on phone exists?
                // Assuming no strict unique constraint on phone in DB based on "Mükerrer Kayıt Kontrol" existing.

                try {
                    // Check if exists one last time if paranoid, or just insert.
                    // Let's just insert what Admin approved.
                    await addLead({
                        ad_soyad: lead.ad_soyad,
                        telefon: lead.telefon,
                        basvuru_kanali: lead.basvuru_kanali,
                        durum: 'Yeni',
                        aciklama_uzun: lead.aciklama_uzun,
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
