
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLeads } from '@/lib/sheets';
import { supabaseAdmin } from '@/lib/supabase';
import { Customer } from '@/lib/types';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    // Security: Only Admin can migrate
    if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    try {
        console.log('Migration started...');

        // 1. Fetch ALL data from Sheets
        // Using getLeads helper which handles the column mapping logic
        const customers = await getLeads();
        console.log(`Fetched ${customers.length} customers from Sheets.`);

        // 2. Transform/Map to Supabase Schema
        // Sheets has many columns, we map them to our clean SQL table
        const validCustomers = customers.map(c => {
            // Data Cleaning
            let limit = null;
            if (c.kredi_limiti) {
                // remove non-numeric
                const clean = c.kredi_limiti.replace(/[^0-9.]/g, '');
                if (clean) limit = parseFloat(clean);
            }

            let talep = null;
            let talep = null;
            if (c.talep_edilen_tutar) {
                // it might be a number or string
                const rawTutar = c.talep_edilen_tutar as any;
                const val = typeof rawTutar === 'string' ? rawTutar.replace(/[^0-9.]/g, '') : rawTutar;
                if (val) talep = parseFloat(val as string);
            }

            // Map standard fields
            return {
                id: c.id, // Keep same ID for consistency
                created_at: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
                ad_soyad: c.ad_soyad || 'Bilinmiyor',
                telefon: c.telefon,
                tc_kimlik: c.tc_kimlik,
                email: c.email,
                dogum_tarihi: c.dogum_tarihi ? parseDateSafe(c.dogum_tarihi) : null,

                durum: c.durum || 'Yeni',
                onay_durumu: c.onay_durumu || 'Beklemede',

                sahip_email: c.sahip,

                sehir: c.sehir,
                ilce: c.ilce,
                meslek_is: c.meslek_is,
                maas_bilgisi: c.son_yatan_maas,

                icra_durumu: {
                    acik_icra: c.acik_icra_varmi,
                    kapali_icra: c.kapali_icra_varmi,
                    detay: c.acik_icra_detay
                },
                dava_durumu: {
                    varmi: c.dava_dosyasi_varmi,
                    detay: c.dava_detay
                },

                admin_notu: c.admin_notu,
                arama_notu: c.arama_not_kisa,

                basvuru_kanali: c.basvuru_kanali,
                talep_edilen_urun: c.talep_edilen_urun,
                talep_edilen_tutar: talep,
            };
        });

        // 3. Batch Insert to Supabase
        const batchSize = 100;
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < validCustomers.length; i += batchSize) {
            const batch = validCustomers.slice(i, i + batchSize);

            const { error } = await supabaseAdmin
                .from('leads')
                .upsert(batch, { onConflict: 'id' });

            if (error) {
                console.error(`Batch ${i} failed:`, error);
                failCount += batch.length;
            } else {
                successCount += batch.length;
                console.log(`Batch ${i} - ${i + batch.length} migrated.`);
            }
        }

        return NextResponse.json({
            success: true,
            total: customers.length,
            migrated: successCount,
            failed: failCount
        });

    } catch (error: any) {
        console.error('Migration fatal error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

function parseDateSafe(dateStr: string) {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0]; // Return YYYY-MM-DD for SQL date
    } catch {
        return null;
    }
}
