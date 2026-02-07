import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const startDate = req.nextUrl.searchParams.get('startDate');
        const endDate = req.nextUrl.searchParams.get('endDate');

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, error: 'Missing date parameters' }, { status: 400 });
        }

        // Fetch all leads in date range - ONLY completed applications
        const { data: leads, error } = await supabaseAdmin
            .from('leads')
            .select('*')
            .gte('created_at', startDate)
            .lte('created_at', `${endDate}T23:59:59`)
            .in('durum', ['Başvuru Alındı', 'Onaylandı', 'Teslim edildi', 'İptal/Vazgeçti']); // Only completed applications

        if (error) {
            console.error('Analytics query error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // 1. Çalışma Şekli - Filter out empty values
        const workTypeCounts: Record<string, number> = {};
        leads?.forEach(lead => {
            const workType = lead.calisma_sekli;
            if (workType && workType.trim() !== '') {
                workTypeCounts[workType] = (workTypeCounts[workType] || 0) + 1;
            }
        });
        const workTypes = Object.entries(workTypeCounts).map(([name, value]) => ({ name, value }));

        // 2. Top 5 Şehir - Filter out empty values
        const cityCounts: Record<string, number> = {};
        leads?.forEach(lead => {
            const city = lead.sehir;
            if (city && city.trim() !== '') {
                cityCounts[city] = (cityCounts[city] || 0) + 1;
            }
        });
        const topCities = Object.entries(cityCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));

        // 3. Yaş Grupları - Calculate from birth date
        const ageGroupCounts: Record<string, number> = {
            '18-25': 0,
            '26-35': 0,
            '36-45': 0,
            '46-55': 0,
            '56+': 0
        };
        const today = new Date();
        leads?.forEach(lead => {
            if (lead.dogum_tarihi) {
                const birthDate = new Date(lead.dogum_tarihi);
                const age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
                    ? age - 1
                    : age;

                if (adjustedAge >= 18 && adjustedAge <= 25) ageGroupCounts['18-25']++;
                else if (adjustedAge >= 26 && adjustedAge <= 35) ageGroupCounts['26-35']++;
                else if (adjustedAge >= 36 && adjustedAge <= 45) ageGroupCounts['36-45']++;
                else if (adjustedAge >= 46 && adjustedAge <= 55) ageGroupCounts['46-55']++;
                else if (adjustedAge >= 56) ageGroupCounts['56+']++;
            }
        });
        const ageGroups = Object.entries(ageGroupCounts).map(([name, value]) => ({ name, value }));

        // 4. Gelir Grubu - Use salary ranges
        const incomeGroupCounts: Record<string, number> = {
            '0-10K': 0,
            '10K-20K': 0,
            '20K-30K': 0,
            '30K-40K': 0,
            '40K+': 0
        };

        leads?.forEach(lead => {
            const salary = lead.maas_ortalama || 0;
            if (salary > 0) {
                if (salary < 10000) incomeGroupCounts['0-10K']++;
                else if (salary < 20000) incomeGroupCounts['10K-20K']++;
                else if (salary < 30000) incomeGroupCounts['20K-30K']++;
                else if (salary < 40000) incomeGroupCounts['30K-40K']++;
                else incomeGroupCounts['40K+']++;
            }
        });
        const incomeGroups = Object.entries(incomeGroupCounts).map(([name, value]) => ({ name, value }));

        // 5. İptal Oranı - Only count completed statuses
        const approved = leads?.filter(l => l.durum === 'Onaylandı' || l.durum === 'Teslim edildi').length || 0;
        const cancelled = leads?.filter(l => l.durum === 'İptal/Vazgeçti').length || 0;
        const cancellationRate = { approved, cancelled };

        // 6. İptal Sebepleri - Filter out empty reasons
        const cancellationReasonCounts: Record<string, number> = {};
        leads?.filter(l => l.durum === 'İptal/Vazgeçti').forEach(lead => {
            const reason = lead.iptal_nedeni || lead.iptal_sebebi; // Try both field names
            if (reason && reason.trim() !== '') {
                cancellationReasonCounts[reason] = (cancellationReasonCounts[reason] || 0) + 1;
            }
        });
        const cancellationReasons = Object.entries(cancellationReasonCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));

        return NextResponse.json({
            success: true,
            data: {
                workTypes,
                topCities,
                ageGroups,
                incomeGroups,
                cancellationRate,
                cancellationReasons
            }
        });

    } catch (error: any) {
        console.error('Analytics error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
