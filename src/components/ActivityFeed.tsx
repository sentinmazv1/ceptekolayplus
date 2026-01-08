'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, MessageCircle, Phone, FileText, CheckCircle2, User, Clock, Loader2 } from 'lucide-react';

interface LogEntry {
    log_id: string;
    timestamp: string;
    user_email: string;
    customer_id: string;
    action: string;
    old_value?: string;
    new_value?: string;
    note?: string;
}

export default function ActivityFeed() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchActivity = async () => {
        try {
            const res = await fetch('/api/activity');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    // Only update if data changed to avoid rerenders/flicker? 
                    // For now, simple set.
                    setLogs(data.logs);
                }
            }
        } catch (error) {
            console.error('Activity fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivity();
        const interval = setInterval(fetchActivity, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, []);

    const getActionDetails = (log: LogEntry) => {
        let icon = <Activity className="w-4 h-4 text-gray-500" />;
        let text = 'İşlem yaptı';
        let colorClass = 'bg-gray-50 border-gray-100';

        switch (log.action) {
            case 'PULL_LEAD':
                icon = <Phone className="w-4 h-4 text-indigo-600" />;
                text = 'Yeni müşteri çekti 🚀';
                colorClass = 'bg-indigo-50 border-indigo-100';
                break;
            case 'SEND_SMS':
                icon = <MessageCircle className="w-4 h-4 text-blue-600" />;
                text = 'SMS gönderdi 💬';
                colorClass = 'bg-blue-50 border-blue-100';
                break;
            case 'SEND_WHATSAPP':
                icon = <MessageCircle className="w-4 h-4 text-green-600" />;
                text = 'WhatsApp mesajı attı 🟢';
                colorClass = 'bg-green-50 border-green-100';
                break;
            case 'UPDATE_STATUS':
                icon = <FileText className="w-4 h-4 text-amber-600" />;
                // text = `Durumu güncelledi: ${log.new_value}`;
                text = 'Durum güncellemesi yaptı';
                if (log.new_value === 'Onaylandı') {
                    icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
                    text = 'Müşteriyi ONAYLADI! 🎉';
                    colorClass = 'bg-emerald-50 border-emerald-100';
                } else if (log.new_value === 'Teslim edildi') {
                    icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
                    text = 'Teslimat Gerçekleşti! 📦';
                    colorClass = 'bg-emerald-50 border-emerald-100';
                }
                else {
                    colorClass = 'bg-amber-50 border-amber-100';
                }
                break;
            default:
                break;
        }

        return { icon, text, colorClass };
    };

    const formatTime = (ts: string) => {
        const date = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Az önce';
        if (diffMins < 60) return `${diffMins} dk önce`;

        const hours = date.getHours().toString().padStart(2, '0');
        const mins = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${mins}`;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-xl">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    Canlı Akış
                </h3>
                <span className="text-xs text-gray-400 font-mono text-[10px] bg-gray-50 px-2 py-1 rounded">LIVE</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" style={{ maxHeight: '400px' }}>
                {loading && logs.length === 0 ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {logs.slice(0, 20).map((log) => {
                            const { icon, text, colorClass } = getActionDetails(log);
                            const userName = log.user_email.split('@')[0];

                            return (
                                <motion.div
                                    key={log.log_id}
                                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3 }}
                                    className={`p-3 rounded-lg border ${colorClass} flex items-start gap-3 shadow-sm`}
                                >
                                    <div className="bg-white p-1.5 rounded-full shadow-sm border border-gray-100 mt-0.5">
                                        {icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className="text-xs font-bold text-gray-900 truncate pr-2 capitalize">
                                                {userName}
                                            </p>
                                            <span className="text-[10px] text-gray-500 whitespace-nowrap flex items-center gap-1 opacity-70">
                                                <Clock className="w-3 h-3" />
                                                {formatTime(log.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 font-medium leading-snug">
                                            {text}
                                        </p>
                                        {log.note && (
                                            <p className="text-xs text-gray-500 mt-1 italic truncate">
                                                "{log.note}"
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
