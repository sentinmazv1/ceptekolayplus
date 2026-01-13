import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { uploadFileToDrive } from '@/lib/drive';
import { logAction } from '@/lib/leads';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const customerId = formData.get('customerId') as string;
        const label = formData.get('label') as string; // 'gorsel_1' or 'gorsel_2'

        if (!file || !customerId || !label) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const driveFile = await uploadFileToDrive(file, customerId, label);

        // We don't update the sheet here directly, or we could? 
        // The UI can call 'updateLead' after getting the URL. 
        // BUT 'updateLead' is easier if we just return the URL here.

        // Log it
        await logAction({
            log_id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            user_email: session.user.email,
            customer_id: customerId,
            action: label === 'gorsel_1' ? 'UPLOAD_IMAGE_1' : 'UPLOAD_IMAGE_2',
            new_value: driveFile.webViewLink || ''
        });

        return NextResponse.json({ url: driveFile.webViewLink });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}
