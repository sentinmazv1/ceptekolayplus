import { NextResponse } from 'next/server';
import { getLeads } from '@/lib/leads';
import { Customer } from '@/lib/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface DuplicateGroup {
    phoneNumber: string;
    customers: Customer[];
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        // Security Check: Only Admins can see duplicates
        if (!session || session.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const leads = await getLeads();

        // Group by Phone
        const groups: Record<string, Customer[]> = {};

        leads.forEach(lead => {
            if (!lead.telefon) return;

            // Normalize phone: remove spaces, chars, keep digits
            // We assume +90 or 0 or 5 starts are common.
            // Best normalization (simple): remove all non-digits
            const raw = lead.telefon.replace(/\D/g, '');

            // Optional: You might want to strip '90' or '0' prefix if inconsistent
            // But let's start with strict exact digit match for safety

            if (raw.length < 10) return; // Skip too short numbers

            if (!groups[raw]) {
                groups[raw] = [];
            }
            groups[raw].push(lead);
        });

        // Filter for duplicates only
        const duplicateGroups: DuplicateGroup[] = Object.keys(groups)
            .filter(phone => groups[phone].length > 1)
            .map(phone => ({
                phoneNumber: phone,
                customers: groups[phone]
            }));

        return NextResponse.json({ groups: duplicateGroups });

    } catch (error) {
        console.error('Duplicate scan failed', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
