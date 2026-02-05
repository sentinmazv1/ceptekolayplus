import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { sendSMS } from '@/lib/sms';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { customerIds, message, templateId } = await req.json();

        if (!customerIds || customerIds.length === 0) {
            return NextResponse.json({ success: false, error: 'No customers selected' }, { status: 400 });
        }

        if (!message || message.trim() === '') {
            return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
        }

        // Fetch customers
        const { data: customers, error: fetchError } = await supabaseAdmin
            .from('leads')
            .select('id, ad_soyad, telefon')
            .in('id', customerIds);

        if (fetchError) {
            console.error('Error fetching customers:', fetchError);
            return NextResponse.json({ success: false, error: 'Failed to fetch customers' }, { status: 500 });
        }

        // Send SMS to each customer
        const results = [];
        let sentCount = 0;
        let failedCount = 0;

        for (const customer of customers) {
            if (!customer.telefon) {
                results.push({
                    customerId: customer.id,
                    customerName: customer.ad_soyad,
                    success: false,
                    error: 'No phone number'
                });
                failedCount++;
                continue;
            }

            // Personalize message
            const personalizedMessage = message
                .replace(/{ad_soyad}/g, customer.ad_soyad)
                .replace(/{telefon}/g, customer.telefon);

            try {
                const { success, result } = await sendSMS(customer.telefon, personalizedMessage);

                if (success) {
                    sentCount++;
                    results.push({
                        customerId: customer.id,
                        customerName: customer.ad_soyad,
                        success: true
                    });
                } else {
                    failedCount++;
                    results.push({
                        customerId: customer.id,
                        customerName: customer.ad_soyad,
                        success: false,
                        error: result || 'SMS send failed'
                    });
                }
            } catch (error: any) {
                failedCount++;
                results.push({
                    customerId: customer.id,
                    customerName: customer.ad_soyad,
                    success: false,
                    error: error.message
                });
            }
        }

        return NextResponse.json({
            success: true,
            sent: sentCount,
            failed: failedCount,
            total: customers.length,
            results
        });

    } catch (error: any) {
        console.error('Bulk SMS error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
