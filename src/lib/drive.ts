
import { supabaseAdmin } from './supabase';

export async function uploadFileToDrive(file: File, customerId: string, label: string) {
    const timestamp = new Date().getTime();
    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${customerId}/${label}_${timestamp}_${safeName}`;

    const buffer = await file.arrayBuffer();

    // Storage 'from' bucket needs to exist.
    // We'll use 'customer-files'.
    const { data, error } = await supabaseAdmin
        .storage
        .from('customer-files')
        .upload(path, buffer, {
            contentType: file.type,
            upsert: false
        });

    if (error) {
        console.error('Supabase Storage Upload Error:', error);
        throw error;
    }

    // Get Public URL
    // Note: Bucket must be Public for this to work without signed URLs.
    const { data: { publicUrl } } = supabaseAdmin
        .storage
        .from('customer-files')
        .getPublicUrl(path);

    return {
        id: data.path, // path within bucket
        webViewLink: publicUrl,
        webContentLink: publicUrl
    };
}
