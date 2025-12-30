
import { SMS_TEMPLATES } from './sms-templates';

interface SMSConfig {
    usercode?: string;
    password?: string;
    header?: string; // e.g., "CEPTEKOLAY"
}

export async function sendSMS(phone: string, message: string): Promise<{ success: boolean; result?: string }> {
    const config: SMSConfig = {
        usercode: process.env.NETGSM_USERCODE,
        password: process.env.NETGSM_PASSWORD,
        header: process.env.NETGSM_HEADER || 'CEPTEKOLAY'
    };

    // Simulation Mode if no credentials
    if (!config.usercode || !config.password) {
        console.log('--- [SMS SIMULATION] ---');
        console.log(`To: ${phone}`);
        console.log(`Header: ${config.header}`);
        console.log(`Message: ${message}`);
        console.log('------------------------');
        return { success: true, result: 'SIMULATION' };
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
        url.searchParams.append('msgheader', config.header || 'CEPTEKOLAY');
        url.searchParams.append('filter', '0');

        const response = await fetch(url.toString(), { method: 'GET' });
        const result = await response.text();

        console.log(`[NetGSM] Response: ${result}`);

        if (result.startsWith('00')) {
            console.log('[NetGSM] SMS Sent Successfully');
            return { success: true, result };
        } else {
            console.error(`[NetGSM] Failed to send. Error Code: ${result}`);
            return { success: false, result };
        }
    } catch (error: any) {
        console.error('[NetGSM] HTTP Request Error:', error);
        return { success: false, result: error.message };
    }
}
