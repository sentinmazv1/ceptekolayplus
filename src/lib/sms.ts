
import { SMS_TEMPLATES } from './sms-templates';

interface SMSConfig {
    usercode?: string;
    password?: string;
    header?: string; // e.g., "CEPTEKOLAY"
}

export async function sendSMS(phone: string, message: string): Promise<{ success: boolean; result?: string }> {
    const config: SMSConfig = {
        usercode: process.env.NETGSM_USERCODE || '8503467607', // Fallback for debugging (REMOVE LATER)
        password: process.env.NETGSM_PASSWORD || 'P5.AL3D1',   // Fallback for debugging (REMOVE LATER)
        header: process.env.NETGSM_HEADER || 'CEPTEKLYLTD'
    };

    // Simulation Mode if no credentials
    if (!config.usercode || !config.password) {
        console.log('--- [SMS SIMULATION] ---');
        console.log(`To: ${phone}`);
        console.log(`Header: ${config.header}`);
        console.log(`Message: ${message}`);
        console.log('------------------------');
        return { success: true, result: 'SIMULATION_MODE_ACTIVE (Check Vercel Env Vars)' };
    }

    // NetGSM API Implementation
    // Endpoint: https://api.netgsm.com.tr/sms/send/get
    try {
        console.log(`[NetGSM] Sending SMS to ${phone}...`);

        const url = new URL('https://api.netgsm.com.tr/sms/send/get');
        url.searchParams.append('usercode', config.usercode);
        url.searchParams.append('password', config.password);
        url.searchParams.append('gsmno', phone);
        url.searchParams.append('message', message);
        url.searchParams.append('msgheader', config.header || 'CEPTEKLYLTD');
        url.searchParams.append('filter', '0');

        const response = await fetch(url.toString(), { method: 'GET' });
        const result = await response.text();

        console.log(`[NetGSM] Response: ${result}`);

        if (result.startsWith('00')) {
            console.log('[NetGSM] SMS Sent Successfully');
            // Extract Job ID if needed: result.split(' ')[1]
            return { success: true, result };
        } else {
            // Even if not 00, return the code to UI so user can see '30', '40' etc.
            console.error(`[NetGSM] Failed to send. Error Code: ${result}`);
            return { success: false, result: `NETGSM_ERROR_CODE_${result}` };
        }
    } catch (error: any) {
        console.error('[NetGSM] HTTP Request Error:', error);
        return { success: false, result: error.message };
    }
}
