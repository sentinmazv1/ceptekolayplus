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
        // --- PREVIEW MODE ---
        if (mode === 'preview') {
            // Helper for safe fetching
            const safeFetch = async (range: string) => {
                try {
                    return await fetchSheetData(range);
                } catch (e) {
                    console.warn(`Sheet fetch failed for ${range}:`, e);
                    return null;
                }
            };

            // 1. Fetch "Aranma Talepleri"
            const aramaRows = await safeFetch('Aranma Talepleri!A2:E');
            // 2. Fetch "Web Başvuru"
            const basvuruRows = await safeFetch('Başvuru Yapanlar!A2:G');
            // 3. Fetch "Durum Sorgulama"
            const sorguRows = await safeFetch('Durum Sorgulama!A2:E');

            const allRows: any[] = [];

            // A. Aranma Talepleri (Basit: İsim, Tel)
            if (aramaRows) {
                aramaRows.forEach(r => {
                    // Col indices: A=Time, B=Name, C=Phone, D=Note
                    const name = r[1] ? String(r[1]).trim() : '';
                    const phone = r[2] ? String(r[2]).replace(/\s/g, '') : '';
                    const note = r[3] || '';

                    if (name && phone && phone.length >= 10) {
                        allRows.push({
                            temp_id: crypto.randomUUID(),
                            ad_soyad: name,
                            telefon: phone,
                            basvuru_kanali: 'Aranma Talebi',
                            aciklama_uzun: `Talep: Aranma İsteği. Not: ${note}`,
                            durum: 'TALEP_BEKLEYEN', // PENDING REQUEST
                            ozel_musteri_mi: true,
                            e_devlet_sifre: '',
                            raw_data: r
                        });
                    }
                });
            }

            // B. Başvuru Yapanlar (Detaylı)
            if (basvuruRows) {
                basvuruRows.forEach(r => {
                    // Mapping assumption: A=Time, B=Name, C=Phone, D=TC, E=Product, F=E-Devlet Pass (maybe)
                    const name = r[1] ? String(r[1]).trim() : '';
                    const phone = r[2] ? String(r[2]).replace(/\s/g, '') : '';
                    const tc = r[3] ? String(r[3]).trim() : '';

                    if (name && phone && phone.length >= 10) {
                        allRows.push({
                            temp_id: crypto.randomUUID(),
                            ad_soyad: name,
                            telefon: phone,
                            tc_kimlik: tc,
                            basvuru_kanali: 'Web Başvuru',
                            aciklama_uzun: `Talep: Web Başvurusu.`,
                            talep_edilen_urun: r[4] || '',
                            durum: 'TALEP_BEKLEYEN',
                            ozel_musteri_mi: true,
                            e_devlet_sifre: r[5] || '', // If present
                            raw_data: r
                        });
                    }
                });
            }

            // C. Durum Sorgulama
            if (sorguRows) {
                sorguRows.forEach(r => {
                    const name = r[1] ? String(r[1]).trim() : '';
                    const phone = r[2] ? String(r[2]).replace(/\s/g, '') : '';

                    if (name && phone && phone.length >= 10) {
                        allRows.push({
                            temp_id: crypto.randomUUID(),
                            ad_soyad: name,
                            telefon: phone,
                            basvuru_kanali: 'Durum Sorgulama',
                            aciklama_uzun: `Talep: Başvuru Durumu Sorgulama.`,
                            durum: 'TALEP_BEKLEYEN',
                            ozel_musteri_mi: false,
                            raw_data: r
                        });
                    }
                });
            }

            // Check Duplicates in DB
            // We duplicate check against ALL leads to mark "Existing"
            // (Even requests might be from existing customers)
            const phones = allRows.map(r => r.telefon);

            const { data: existingLeads } = await supabaseAdmin
                .from('leads')
                .select('telefon')
                .in('telefon', phones);

            const existingPhones = new Set(existingLeads?.map(l => l.telefon) || []);

            // Map duplications
            const previewData = allRows.map(row => ({
                ...row,
                exists: existingPhones.has(row.telefon),
                is_request: true
            }));

            // FILTER: We show ALL, but mark existing.
            // Actually, for Requests module, maybe we want to import even if existing? 
            // "Mevcut müşteri tekrar başvurdu". 
            // Logic: If existing, we can't insert duplicate Phone (Unique Key). 
            // So we can only import NEW numbers. 
            // Existing ones need to be handled manually or update existing? 
            // For now, let's stick to "Only New" for import, OR let user decide?
            // The UI filters logic handles the "New" filter usually.
            // We pass everything to UI.

            return NextResponse.json({
                success: true,
                mode: 'preview',
                data: previewData,
                count: previewData.length,
                total_found: allRows.length
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
