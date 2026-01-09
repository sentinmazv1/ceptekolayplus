'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, MessageCircle, Phone, FileText, CheckCircle2, User, Clock, Loader2, Zap, Smartphone } from 'lucide-react';

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
        // Optimization: Don't poll if tab is hidden
        if (typeof document !== 'undefined' && document.hidden) return;

        try {
            const res = await fetch('/api/activity');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
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
        const interval = setInterval(fetchActivity, 60000); // Poll every 60s (Optimized from 10s)
        return () => clearInterval(interval);
    }, []);

    const getActionDetails = (log: LogEntry) => {
        let icon = <Activity className="w-4 h-4 text-gray-500" />;
        let text = 'İşlem yaptı';
        let bgGradient = 'from-gray-50 to-white';
        let border = 'border-gray-200';
        let iconBg = 'bg-gray-100';

        switch (log.action) {
            case 'PULL_LEAD':
                icon = <Phone className="w-4 h-4 text-white" />;
                text = 'Yeni müşteri çekti';
                bgGradient = 'from-indigo-50/80 to-white';
                border = 'border-indigo-100';
                iconBg = 'bg-indigo-500 shadow-indigo-200';
                break;
            case 'SEND_SMS':
                icon = <MessageCircle className="w-4 h-4 text-white" />;
                text = 'SMS gönderdi';
                bgGradient = 'from-blue-50/80 to-white';
                border = 'border-blue-100';
                iconBg = 'bg-blue-500 shadow-blue-200';
                break;
            case 'SEND_WHATSAPP':
                icon = <Smartphone className="w-4 h-4 text-white" />;
                text = 'WhatsApp mesajı';
                bgGradient = 'from-green-50/80 to-white';
                border = 'border-green-100';
                iconBg = 'bg-green-500 shadow-green-200';
                break;
            case 'UPDATE_STATUS':
                if (log.new_value === 'Onaylandı') {
                    icon = <CheckCircle2 className="w-4 h-4 text-white" />;
                    text = 'SATIŞI ONAYLADI! 🎉';
                    bgGradient = 'from-emerald-100 via-emerald-50 to-white';
                    border = 'border-emerald-200 ring-1 ring-emerald-100';
                    iconBg = 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-200 animate-pulse';
                } else if (log.new_value === 'Teslim edildi') {
                    icon = <CheckCircle2 className="w-4 h-4 text-white" />;
                    text = 'TESLİMAT YAPILDI! 📦';
                    bgGradient = 'from-purple-100 via-purple-50 to-white';
                    border = 'border-purple-200';
                    iconBg = 'bg-purple-600 shadow-purple-200';
                }
                else {
                    icon = <FileText className="w-4 h-4 text-white" />;
                    text = 'Durum güncelledi';
                    bgGradient = 'from-amber-50/80 to-white';
                    border = 'border-amber-100';
                    iconBg = 'bg-amber-500 shadow-amber-200';
                }
                break;
            default:
                break;
        }

        return { icon, text, bgGradient, border, iconBg };
    };

    const formatTime = (ts: string) => {
        const date = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Az önce';
        if (diffMins < 60) return `${diffMins} dk`;

        const hours = date.getHours().toString().padStart(2, '0');
        const mins = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${mins}`;
    };

    return (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 ring-1 ring-gray-200/50 h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-white/50 to-gray-50/50 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25"></div>
                        <div className="relative bg-gradient-to-br from-red-500 to-pink-600 p-1.5 rounded-full shadow-lg shadow-red-200 text-white">
                            <Zap className="w-3.5 h-3.5" />
                        </div>
                    </div>
                    <div>
                        <h3 className="font-extrabold text-gray-800 text-sm tracking-tight leading-none mb-0.5">Canlı Akış</h3>
                        <p className="text-[10px] text-gray-400 font-medium">Anlık Ekip Aktiviteleri</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-full border border-green-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-green-600 tracking-wide">ONLİNE</span>
                </div>
            </div>

            {/* Feed List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative">
                {/* Vertical Timeline Line */}
                <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-transparent via-gray-200 to-transparent z-0"></div>

                {loading && logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        <span className="text-xs text-gray-400 font-medium">Veriler yükleniyor...</span>
                    </div>
                ) : (
                    <div className="space-y-5 relative z-10">
                        <AnimatePresence initial={false}>
                            {logs.slice(0, 25).map((log, index) => {
                                const { icon, text, bgGradient, border, iconBg } = getActionDetails(log);
                                const userName = log.user_email.split('@')[0];

                                return (
                                    <motion.div
                                        key={log.log_id}
                                        initial={{ opacity: 0, x: 20, filter: 'blur(5px)' }}
                                        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                                        transition={{ duration: 0.4, delay: index * 0.05 }}
                                        className="flex gap-3 group"
                                    >
                                        {/* Avatar / Icon Col */}
                                        <div className="flex flex-col items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md ring-2 ring-white z-10 ${iconBg} transition-transform group-hover:scale-110 duration-200`}>
                                                {icon}
                                            </div>
                                        </div>

                                        {/* Content Card */}
                                        <div className={`flex-1 min-w-0 bg-gradient-to-br ${bgGradient} rounded-xl p-3 border ${border} shadow-sm group-hover:shadow-md transition-all duration-200 relative`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold text-gray-900 capitalize flex items-center gap-1">
                                                    {userName}
                                                </span>
                                                <span className="text-[10px] font-medium text-gray-400 bg-white/50 px-1.5 py-0.5 rounded-md border border-gray-100/50">
                                                    {formatTime(log.timestamp)}
                                                </span>
                                            </div>

                                            <p className="text-xs text-gray-700 font-medium leading-relaxed">
                                                {text}
                                            </p>

                                            {log.note && (
                                                <div className="mt-2 pt-2 border-t border-gray-100/50 flex items-start gap-1.5">
                                                    <span className="block w-0.5 h-full min-h-[12px] bg-gray-300 rounded-full"></span>
                                                    <p className="text-[10px] text-gray-500 italic line-clamp-2">
                                                        {log.note}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Triangle Pointer */}
                                            <div className="absolute top-3.5 -left-1.5 w-3 h-3 bg-white border-l border-b border-gray-200 transform rotate-45 z-0"></div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Fade effect at bottom */}
            <div className="h-12 bg-gradient-to-t from-white to-transparent pointer-events-none absolute bottom-0 left-0 right-0 z-20"></div>
        </div>
    );
}
