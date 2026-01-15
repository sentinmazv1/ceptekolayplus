
import { supabaseAdmin } from './supabase';

export async function uploadFileToDrive(file: File, customerId: string, label: string) {
    const timestamp = new Date().getTime();
    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${customerId}/${label}_${timestamp}_${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check if bucket exists (Diagnostic)
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
    if (bucketError) {
        console.error('Error listing buckets:', bucketError);
    } else {
        const exists = buckets.find(b => b.name === 'customer-files');
        if (!exists) {
            console.log('Bucket customer-files NOT FOUND. Attempting to create...');
            const { data: newBucket, error: createError } = await supabaseAdmin.storage.createBucket('customer-files', {
                public: true // Attempt to make it public
            });
            if (createError) {
                console.error('Failed to create bucket:', createError);
                // Don't throw yet, try upload anyway in case list was wrong
            } else {
                console.log('Bucket created successfully.');
            }
        }
    }

    // Storage 'from' bucket needs to exist.
    // We'll use 'customer-files'.
    const { data, error } = await supabaseAdmin
        .storage
        .from('customer-files')
        .upload(path, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: false
        });

    if (error) {
        console.error('Supabase Storage Upload Error:', JSON.stringify(error, null, 2));
        throw new Error('Storage Upload Failed: ' + error.message);
    }

    // Get Public URL
    // Note: Bucket must be Public for this to work without signed URLs.
    const { data: publicURLData } = supabaseAdmin
        .storage
        .from('customer-files')
        .getPublicUrl(path);

    if (!publicURLData.publicUrl) {
        throw new Error('Failed to generate public URL');
    }

    return {
        id: data.path, // path within bucket
        webViewLink: publicURLData.publicUrl,
        webContentLink: publicURLData.publicUrl
    };
}
