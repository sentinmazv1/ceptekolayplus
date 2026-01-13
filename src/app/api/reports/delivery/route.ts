
import { NextRequest, NextResponse } from 'next/server';
import { getLeads } from '@/lib/leads';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const dateFilter = searchParams.get('date'); // YYYY-MM-DD

        // Fetch leads directly using the Service Layer
        const leads = await getLeads({ durum: 'Teslim edildi' }); // Pre-filter if possible, or fetch all if leads() filters are limited

        // Filter for specific date
        let deliveredCustomers = leads;

        if (dateFilter) {
            deliveredCustomers = deliveredCustomers.filter(c => {
                // Check 'teslim_tarihi' first, fallback to 'updated_at'
                const rawDate = c.teslim_tarihi || c.updated_at;
                if (!rawDate) return false;

                // Create date object
                const d = new Date(rawDate);
                if (isNaN(d.getTime())) return false; // Invalid date

                // Convert to Turkey Time YYYY-MM-DD
                const turkeyDate = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });

                // Compare exact string match (YYYY-MM-DD)
                return turkeyDate === dateFilter;
            });
        }

        // Sort by delivery date (newest first)
        deliveredCustomers.sort((a, b) => {
            const dateA = new Date(a.teslim_tarihi || a.updated_at || 0).getTime();
            const dateB = new Date(b.teslim_tarihi || b.updated_at || 0).getTime();
            return dateB - dateA;
        });

        return NextResponse.json({
            success: true,
            count: deliveredCustomers.length,
            customers: deliveredCustomers
        });

    } catch (error: any) {
        console.error('Error fetching delivery report:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
