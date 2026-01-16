
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addLead } from '@/lib/leads';
import { Customer } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { leads } = await req.json();

        if (!Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
        }

        const stats = {
            success: 0,
            error: 0,
            errors: [] as string[]
        };

        // Process in chunks to avoid timeouts? 
        // For < 1000 leads, sequential or small parallel is fine.
        // Let's do batch of 10.
        const BATCH_SIZE = 10;

        for (let i = 0; i < leads.length; i += BATCH_SIZE) {
            const chunk = leads.slice(i, i + BATCH_SIZE);
            await Promise.all(chunk.map(async (lead: any) => {
                try {
                    // Minimal validation
                    if (!lead.ad_soyad || !lead.telefon) {
                        throw new Error('Missing name or phone');
                    }

                    // Map CSV fields to Customer type if needed, 
                    // but we expect Frontend to match fields.
                    const newLead: Partial<Customer> = {
                        ...lead,
                        id: crypto.randomUUID(),
                        created_at: new Date().toISOString(),
                        durum: lead.durum || 'Yeni',
                        onay_durumu: 'Bekliyor',
                        sahip: null, // Ensure explicit null to avoid auto-assign
                    };

                    await addLead(newLead as Customer, session.user?.email || 'Import');
                    stats.success++;
                } catch (e: any) {
                    stats.error++;
                    stats.errors.push(`${lead.ad_soyad || 'Unknown'}: ${e.message}`);
                }
            }));
        }

        return NextResponse.json({ success: true, stats });

    } catch (error: any) {
        console.error('Import error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
