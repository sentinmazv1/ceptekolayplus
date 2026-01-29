'use client';

import { Phone, MessageSquare, Smartphone, MousePointer2, Box } from 'lucide-react';

interface OpsProps {
    data: {
        calls: number;
        sms: number;
        whatsapp: number;
        backoffice: number;
        totalStock: number;
    };
    loading: boolean;
}

export function OpsGrid({ data, loading }: OpsProps) {
    const items = [
        {
            label: 'Arama Kaydı',
            value: data.calls,
            icon: Phone,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10'
        },
        {
            label: 'WhatsApp',
            value: data.whatsapp,
            icon: MessageSquare,
            color: 'text-green-400',
            bg: 'bg-green-500/10'
        },
        {
            label: 'SMS Gönderimi',
            value: data.sms,
            icon: Box, // Placeholder for SMS
            color: 'text-orange-400',
            bg: 'bg-orange-500/10'
        },
        {
            label: 'Backoffice',
            value: data.backoffice,
            icon: MousePointer2,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10'
        }
    ];

    if (loading) return <div className="h-40 bg-white/5 rounded-3xl animate-pulse"></div>;

    return (
        <div className="bg-[#1e293b]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
            <h3 className="text-white font-bold text-lg mb-4">Operasyonel Akış</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map((item) => (
                    <div key={item.label} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                        <div className={`p-2 rounded-xl ${item.bg} ${item.color}`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-black text-white">{item.value}</div>
                        <div className="text-xs text-gray-400 font-medium">{item.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
