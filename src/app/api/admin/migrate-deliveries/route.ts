import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Migration API: Convert Manual Deliveries to Inventory Entries
 * 
 * Finds all delivered customers with IMEI/Serial but no inventory link
 * Creates inventory entries for them and marks them as SATILDI
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Find all manual deliveries (have IMEI but no linked inventory)
        const { data: manualDeliveries, error: fetchError } = await supabaseAdmin
            .from('leads')
            .select('id, ad_soyad, urun_imei, urun_seri_no, marka, model, teslim_tarihi, teslim_eden')
            .in('durum', ['Teslim edildi', 'Satış yapıldı/Tamamlandı'])
            .not('urun_imei', 'is', null)
            .not('urun_seri_no', 'is', null);

        if (fetchError) {
            console.error('Fetch error:', fetchError);
            return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
        }

        if (!manualDeliveries || manualDeliveries.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'Manuel teslim edilmiş ürün bulunamadı.',
                migrated: 0
            });
        }

        // 2. For each manual delivery, check if inventory entry already exists
        let migratedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        for (const delivery of manualDeliveries) {
            try {
                // Check if inventory entry already exists for this IMEI
                const { data: existingInventory } = await supabaseAdmin
                    .from('inventory')
                    .select('id, durum')
                    .eq('imei', delivery.urun_imei)
                    .single();

                if (existingInventory) {
                    // Update existing entry if it's still in STOKTA
                    if (existingInventory.durum === 'STOKTA') {
                        const { error: updateError } = await supabaseAdmin
                            .from('inventory')
                            .update({
                                durum: 'SATILDI',
                                customer_id: delivery.id,
                                satis_tarihi: delivery.teslim_tarihi || new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', existingInventory.id);

                        if (updateError) {
                            errors.push(`${delivery.ad_soyad} (${delivery.urun_imei}): Update failed - ${updateError.message}`);
                        } else {
                            migratedCount++;
                        }
                    } else {
                        skippedCount++;
                        console.log(`Skipped ${delivery.urun_imei} - already sold/processed`);
                    }
                } else {
                    // Create new inventory entry (retroactive)
                    const { error: insertError } = await supabaseAdmin
                        .from('inventory')
                        .insert({
                            imei: delivery.urun_imei,
                            seri_no: delivery.urun_seri_no,
                            marka: delivery.marka || 'BİLİNMİYOR',
                            model: delivery.model || 'Manuel Giriş',
                            durum: 'SATILDI',
                            customer_id: delivery.id,
                            satis_tarihi: delivery.teslim_tarihi || new Date().toISOString(),
                            giris_tarihi: delivery.teslim_tarihi || new Date().toISOString(),
                            // Leave purchase price empty for manual entries
                            alis_fiyati: null,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        });

                    if (insertError) {
                        errors.push(`${delivery.ad_soyad} (${delivery.urun_imei}): Insert failed - ${insertError.message}`);
                    } else {
                        migratedCount++;
                    }
                }
            } catch (err: any) {
                errors.push(`${delivery.ad_soyad}: ${err.message}`);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Migration completed',
            total: manualDeliveries.length,
            migrated: migratedCount,
            skipped: skippedCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
