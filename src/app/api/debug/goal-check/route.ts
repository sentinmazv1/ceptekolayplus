
import { NextRequest, NextResponse } from 'next/server';
import { getAllLogs } from '@/lib/leads';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const logs = await getAllLogs();
        const user = 'gozde'; // Target specific user pattern

        // Time logic same as report
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const threeDaysAgoMidnight = todayMidnight.getTime() - (3 * 24 * 60 * 60 * 1000);
        const todayMidnightTime = todayMidnight.getTime();

        // List all unique users to find 'gozde'
        const allUsers = new Set<string>();
        logs.forEach((l: any) => {
            if (l.user_email) allUsers.add(l.user_email);
        });

        const logsInRange = logs.filter((l: any) => {
            const t = new Date(l.timestamp).getTime();
            const u = l.user_email || '';
            // Search broadly
            return u.toLowerCase().includes('gzd') &&
                l.action === 'PULL_LEAD' &&
                t >= threeDaysAgoMidnight && t < todayMidnightTime;
        });

        // Group by day to see distribution
        const byDay: Record<string, number> = {};
        logsInRange.forEach((l: any) => {
            const d = new Date(l.timestamp).toISOString().split('T')[0];
            byDay[d] = (byDay[d] || 0) + 1;
        });

        const total = logsInRange.length;
        const avg = Math.round(total / 3);
        const goal = Math.max(10, Math.ceil(avg * 1.1));

        return NextResponse.json({
            user_pattern: user,
            range_start: new Date(threeDaysAgoMidnight).toISOString(),
            range_end: new Date(todayMidnightTime).toISOString(),
            total_calls_in_range: total,
            breakdown_by_day: byDay,
            calculated_avg: avg,
            calculated_goal: goal,
            all_users_found: Array.from(allUsers),
            logs_sample: logsInRange.slice(0, 50).map((l: any) => ({ t: l.timestamp, a: l.action })),
            formula: "Math.ceil((total / 3) * 1.1)"
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
