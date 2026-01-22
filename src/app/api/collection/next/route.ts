
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getLead } from '@/lib/leads';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // Logic:
        // 1. Filter by 'Gecikme' class
        // 2. Exclude 'Avukata Sevk' if necessary? Or maybe include them but low priority? 
        //    Let's assume 'Avukata Sevk' are handled differently or just viewed. 
        //    Let's stick to simple "Get Gecikme" for now.
        // 3. Priority: 
        //    - 'Ulaşılamadı' (Status) -> Needs retry
        //    - Null status
        //    - Oldest 'son_arama_zamani' (Rotation)

        // Let's use a simple strategy: Oldest 'son_arama_zamani' (or null) first.

        const nowISO = new Date().toISOString();
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

        // Check if user already has a "locked" or "assigned" debtor? 
        // In sales we lock 'Aranacak'. Here we might want to just pick one.
        // Let's simpler: Just pick one that hasn't been called today.

        const { data: candidates, error } = await supabaseAdmin
            .from('leads')
            .select('id')
            .eq('sinif', 'Gecikme')
            .or(`son_arama_zamani.lt.${twoHoursAgo},son_arama_zamani.is.null`) // Not called in last 2 hours
            .order('son_arama_zamani', { ascending: true, nullsFirst: true })
            .limit(1);

        if (error) throw error;

        if (!candidates || candidates.length === 0) {
            return NextResponse.json({ success: false, message: 'Şu an aranacak gecikmiş kayıt bulunamadı.' });
        }

        const leadId = candidates[0].id;

        // Fetch full details using existing lib
        const lead = await getLead(leadId);

        return NextResponse.json({ success: true, lead });

    } catch (error: any) {
        console.error('Next debtor error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
