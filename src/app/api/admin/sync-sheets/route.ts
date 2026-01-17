
import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetData } from '@/lib/google-sheets';
import { addLead, getLeads } from '@/lib/leads';
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

        // 1. Fetch "Aranma Talepleri" (Sheet 1)
        const aramaRows = await fetchSheetData('Aranma Talepleri!A2:E');

        // 2. Fetch "E-Devlet Verenler" (Sheet 2)
        const edevletRows = await fetchSheetData('E-Devlet Verenler!A2:E');

        let statNewAranma = 0;
        let statNewEdevlet = 0;

        // Common Logic to processed rows
        const processRows = async (rows: any[], source: 'Aranma Talebi' | 'E-Devlet') => {
            let addedCount = 0;
            if (!rows || rows.length === 0) return 0;

            for (const row of rows) {
                // Col 1: Ad Soyad (B)
                // Col 2: Telefon (C)
                // Col 3: Not (D)

                const name = row[1];
                const phone = row[2];

                if (!name || !phone) continue;

                // Create lead object
                const newLead: Partial<Customer> = {
                    ad_soyad: name,
                    telefon: phone,
                    basvuru_kanali: source,
                    durum: 'Yeni',
                    sahip: null, // Pool
                    aciklama_uzun: `Otomasyon ile eklendi. Kaynak: ${source}. Detay: ${row[3] || ''}`,
                };

                // In a manual sync, we might accept that duplicates are checked by the service
                // But addLead might not prevent dupes unless enforced.
                // Assuming addLead handles basic insertion.

                await addLead(newLead, 'Admin Manual Sync');
                addedCount++;
            }
            return addedCount;
        };

        statNewAranma = await processRows(aramaRows, 'Aranma Talebi');
        statNewEdevlet = await processRows(edevletRows, 'E-Devlet');

        return NextResponse.json({
            success: true,
            message: `Senkronizasyon Tamamlandı.`,
            stats: {
                aranma_talebi: statNewAranma,
                edevlet: statNewEdevlet,
                total: statNewAranma + statNewEdevlet
            }
        });

    } catch (error: any) {
        console.error('Manual Sync Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
