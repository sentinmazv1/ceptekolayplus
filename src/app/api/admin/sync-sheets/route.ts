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

            // Process Aranma Talepleri
            // Columns: A=Timestamp?, B=Name, C=Phone, D=Note, E=...
            // User didn't specify changes here, assuming: 1=Name, 2=Phone, 3=Note matches previous logic?
            // Wait, standard Google Forms is: A=Time, B=Name, C=Phone.
            // Let's keep logic for Aranma as is for now: 1=>Name, 2=>Phone.
            if (aramaRows) {
                aramaRows.forEach(r => {
                    const name = r[1] ? String(r[1]).trim() : '';
                    const phone = r[2] ? String(r[2]).replace(/\s/g, '') : '';
                    const note = r[3] || '';

                    if (name && phone && phone.length >= 10) {
                        allRows.push({
                            temp_id: crypto.randomUUID(),
                            ad_soyad: name,
                            telefon: phone,
                            basvuru_kanali: 'Aranma Talebi',
                            aciklama_uzun: `Otomasyon ile eklendi. Kaynak: Aranma Talebi. Detay: ${note}`,
                            durum: 'Yeni',
                            ozel_musteri_mi: true,
                            e_devlet_sifre: '',
                            raw_data: r
                        });
                    }
                });
            }

            // Process E-Devlet Verenler
            // User Config: B=Name, C=TC, D=Phone, E=Pass
            // Indices: 1, 2, 3, 4
            if (edevletRows) {
                edevletRows.forEach(r => {
                    const name = r[1] ? String(r[1]).trim() : '';
                    const tc = r[2] ? String(r[2]).trim() : '';     // Column C
                    const phone = r[3] ? String(r[3]).replace(/\s/g, '') : ''; // Column D
                    const pass = r[4] ? String(r[4]).trim() : '';   // Column E

                    if (name && phone && phone.length >= 10) {
                        allRows.push({
                            temp_id: crypto.randomUUID(),
                            ad_soyad: name,
                            telefon: phone,
                            tc_kimlik: tc, // Map TC
                            basvuru_kanali: 'E-Devlet',
                            aciklama_uzun: `Otomasyon ile eklendi. Kaynak: E-Devlet.`,
                            durum: 'E-Devlet Veren',
                            ozel_musteri_mi: true,
                            e_devlet_sifre: pass,
                            raw_data: r
                        });
                    }
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
                        e_devlet_sifre: lead.e_devlet_sifre, // Pass E-Devlet password
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
