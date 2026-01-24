
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role || '';
    if (!session || !['ADMIN', 'Yönetici', 'admin', 'yonetici'].includes(role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const targetClass = formData.get('target_class') as string;

        if (!file || !targetClass) {
            return NextResponse.json({ error: 'File and target class are required' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const tcs: string[] = [];
        data.forEach((row: any) => {
            if (row[0] && String(row[0]).length === 11) tcs.push(String(row[0]));
        });

        if (tcs.length === 0) {
            return NextResponse.json({ error: 'No valid TCs found' }, { status: 400 });
        }

        // Batch Update
        // Supabase/Postgrest doesn't support "UPDATE WHERE IN list" easily for complex logic, 
        // but simple "update leads set sinif = X where tc_kimlik in (...)" works.
        const updateFields: any = { sinif: targetClass };

        // Auto-Sync Collection Status
        if (targetClass === 'Gecikme') {
            updateFields.tahsilat_durumu = 'Tahsilat Servisinde';
        } else {
            updateFields.tahsilat_durumu = 'Normal';
        }

        const { error, data: updatedRows } = await supabaseAdmin
            .from('leads')
            .update(updateFields)
            .in('tc_kimlik', tcs)
            .select('id');

        if (error) {
            return NextResponse.json({ success: false, error: error.message });
        }

        const count = updatedRows ? updatedRows.length : 0;

        return NextResponse.json({
            success: true,
            updatedCount: count,
            failedCount: tcs.length - count, // Estimate
            message: `${tcs.length} TC'den ${count} tanesi güncellendi.`
        });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
