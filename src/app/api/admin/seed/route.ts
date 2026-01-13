
import { NextRequest, NextResponse } from 'next/server';
import { addLead } from '@/lib/leads';
import { Customer } from '@/lib/types'; // Import types

const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana'];
const JOBS = ['Mühendis', 'Öğretmen', 'Esnaf', 'Memur', 'Diğer', 'Doktor', 'Hemşire'];
const PRODUCTS = ['iPhone 15 Pro', 'Samsung S24', 'MacBook Air', 'iPad Pro', 'Dyson V15'];
const STATUSES = ['Yeni', 'Ulaşılamadı', 'Aranacak', 'Onaya gönderildi', 'Teslim edildi', 'Reddetti', 'Kefil bekleniyor'];
const APPROVALS = ['Beklemede', 'Onaylandı', 'Reddedildi', 'Kefil İstendi'];

function getRandomItem(arr: any[]) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Basic security: only allow in development or if a secret is passed
    // For now, just development convenience. 
    // Ideally check NODE_ENV or a query param key.

    try {
        const generated = [];
        for (let i = 0; i < 20; i++) {
            const city = getRandomItem(CITIES);
            const job = getRandomItem(JOBS);
            const status = getRandomItem(STATUSES);
            const product = getRandomItem(PRODUCTS);
            const amount = Math.floor(Math.random() * 50000) + 10000;
            const approval = getRandomItem(APPROVALS);

            // Logic to make data realistic
            let approvalStatus = approval;
            if (status === 'Teslim edildi') approvalStatus = 'Onaylandı';
            if (status === 'Reddetti') approvalStatus = 'Reddedildi';

            // Construct Customer Object (Supabase Match)
            const customerData: Partial<Customer> = {
                // id: crypto.randomUUID(), // addLead handles ID generation usually or Supabase does 
                // But addLead in leads.ts might expect some fields.
                // Checking leads.ts addLead: it maps input to row. It handles ID generation via Supabase default usually, but let's see. 
                // Using addLead is safer.

                ad_soyad: `Test User ${i + 1}`,
                telefon: `555${Math.floor(Math.random() * 10000000)}`,
                sehir: city,
                meslek_is: job,
                son_yatan_maas: (Math.floor(Math.random() * 40000) + 17000).toString(),
                durum: status as any,
                talep_edilen_urun: product,
                talep_edilen_tutar: amount,
                onay_durumu: approvalStatus as any,
                kredi_limiti: approvalStatus === 'Onaylandı' ? (amount + 5000).toString() : undefined,
                // Guarantor logic
                kefil_ad_soyad: approvalStatus === 'Kefil İstendi' ? 'Kefil Ali' : undefined,

                created_at: randomDate(new Date(2024, 0, 1), new Date()),
                created_by: 'system_seed'
            };

            // Insert using service layer
            const result = await addLead(customerData as Customer, 'system_seed');
            if (result) generated.push(result);
        }

        return NextResponse.json({ success: true, message: `Added ${generated.length} test leads.` });

    } catch (error: any) {
        console.error('Seed Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
