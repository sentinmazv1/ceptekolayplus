
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLeads, getLogs } from '@/lib/sheets';
import { Customer, LogEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [leads, logs] = await Promise.all([
            getLeads(),
            getLogs() // We might need a way to get *all* logs if getLogs defaults to a limit
        ]);

        // Aggregate Data by User
        const userStats: Record<string, {
            email: string; // The key
            totalLeads: number; // Portfolio size
            salesCount: number; // DEPRECATED: removed from usage, replaced by below
            approvedCount: number; // 'Onaylandı'
            deliveredCount: number; // 'Teslim edildi' or 'Satış yapıldı/Tamamlandı'
            callsCount: number;
            smsCount: number;
        }> = {};

        // 1. Portfolio & Sales from Leads
        leads.forEach(lead => {
            const owner = lead.sahip;
            if (!owner) return;

            if (!userStats[owner]) {
                userStats[owner] = { email: owner, totalLeads: 0, salesCount: 0, approvedCount: 0, deliveredCount: 0, callsCount: 0, smsCount: 0 };
            }

            userStats[owner].totalLeads++;

            // Split metrics
            if (lead.durum === 'Onaylandı') {
                userStats[owner].approvedCount++;
            }
            if (lead.durum === 'Teslim edildi' || lead.durum === 'Satış yapıldı/Tamamlandı') {
                userStats[owner].deliveredCount++;
            }
        });

        // 2. Activity from Logs (Calls, SMS)
        // This is an estimation. 
        // SMS is explicit: action === 'SEND_SMS'
        // Calls: inferred from 'PULL_LEAD' (New Call) + 'UPDATE_STATUS' (Result of a call)

        logs.forEach(log => {
            const user = log.user_email;
            if (!user) return;
            // Initialize if not present (e.g. user has no current leads but has history)
            if (!userStats[user]) {
                userStats[user] = { email: user, totalLeads: 0, salesCount: 0, approvedCount: 0, deliveredCount: 0, callsCount: 0, smsCount: 0 };
            }

            if (log.action === 'SEND_SMS') {
                userStats[user].smsCount++;
            }

            if (log.action === 'PULL_LEAD' || log.action === 'SEND_WHATSAPP') {
                userStats[user].callsCount++;
            }
            // Should we count status updates as calls? 
            // Often yes, if they update to "Ulaşılamadı", that was a call attempt.
            // But PULL_LEAD leads to an update. Double counting?
            // User pulls -> Call -> Update. 
            // Creating a "Call" metric is tricky without a specific "Log Call" button.
            // Let's stick to PULL_LEAD as a proxy for "New Call Initiated" for now, 
            // PLUS any manual status change on an EXISTING lead that implies a re-call?
            // Simpler: Just count PULL_LEAD as "New Conversations". 
            // And maybe count "UPDATE_STATUS" where value is "Ulaşılamadı"/"Görüşüldü"?
            // Let's use PULL_LEAD + manual status changes that are NOT 'Aranacak' (which is the result of pull).

            if (log.action === 'UPDATE_STATUS' && log.new_value !== 'Aranacak') {
                // Determine if this was a call outcome.
                // Virtually all status changes happen after a contact attempt.
                userStats[user].callsCount++;
            }
        });


        const statsArray = Object.values(userStats).map(s => ({
            ...s,
            // Calculate a simple score/efficiency? 
            // conversionRate: s.callsCount > 0 ? (s.salesCount / s.callsCount) * 100 : 0
        })).sort((a, b) => b.deliveredCount - a.deliveredCount); // Rank by REAL sales (Delivered)

        return NextResponse.json({
            stats: statsArray,
            generated_at: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('Performance Report Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
