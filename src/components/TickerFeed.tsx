'use client';

import { useEffect, useState } from 'react';
import { Activity, Phone, MessageCircle, CheckCircle2, FileText, Zap } from 'lucide-react';

interface LogEntry {
    log_id: string;
    timestamp: string;
    user_email: string;
    action: string;
    new_value?: string;
    note?: string;
}

export default function TickerFeed() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchActivity = async () => {
        try {
            const res = await fetch('/api/activity');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setLogs(data.logs);
                }
            }
        } catch (error) {
            console.error('Ticker fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivity();
        const interval = setInterval(fetchActivity, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading || logs.length === 0) return null;

    return (
        <div className="bg-gray-900 border-b border-gray-800 h-10 flex items-center overflow-hidden relative z-50">
            <div className="bg-indigo-600 h-full px-4 flex items-center gap-2 z-10 shadow-xl shrink-0">
                <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-pulse" />
                <span className="text-xs font-black text-white tracking-wider uppercase">CANLI YAYIN</span>
            </div>

            {/* Scrolling Content */}
            <div className="flex-1 overflow-hidden relative group cursor-default">
                <div className="animate-ticker flex items-center gap-8 whitespace-nowrap pl-4 hover:pause-animation">
                    {[...logs, ...logs].map((log, idx) => { // Duplicate for infinite scroll
                        const isSale = log.action === 'UPDATE_STATUS' && (log.new_value === 'Onaylandı' || log.new_value === 'Teslim edildi');
                        const user = log.user_email.split('@')[0];
                        let icon = <Activity className="w-3 h-3 text-gray-500" />;
                        let text = `${user} işlem yaptı`;
                        let color = "text-gray-400";

                        if (log.action === 'PULL_LEAD') {
                            icon = <Phone className="w-3 h-3 text-blue-400" />;
                            text = `${user} arama başlattı`;
                            color = "text-blue-300";
                        } else if (log.action === 'SEND_SMS' || log.action === 'SEND_WHATSAPP') {
                            icon = <MessageCircle className="w-3 h-3 text-purple-400" />;
                            text = `${user} mesaj attı`;
                            color = "text-purple-300";
                        } else if (isSale) {
                            icon = <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
                            text = `${user} SATIŞ YAPTI! (₺)`;
                            color = "text-emerald-300 font-bold";
                        }

                        return (
                            <div key={`${log.log_id}-${idx}`} className="flex items-center gap-2 text-xs font-medium opacity-80 hover:opacity-100 transition-opacity">
                                {icon}
                                <span className={color}>{text}</span>
                                <span className="text-gray-600">•</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style jsx>{`
                @keyframes ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-ticker {
                    animation: ticker 60s linear infinite;
                }
                .hover\:pause-animation:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
}
