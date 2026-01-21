'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, MessageCircle, Phone, FileText, CheckCircle2, User, Clock, Loader2, Zap, Smartphone, RefreshCw } from 'lucide-react';

// ... imports

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
    const [refreshing, setRefreshing] = useState(false);

    const fetchActivity = async () => {
        if (typeof document !== 'undefined' && document.hidden) return;

        setRefreshing(true);
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
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchActivity();
        const interval = setInterval(fetchActivity, 300000); // Poll every 5 minutes
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm">Canlı Akış</h3>
                        <p className="text-[10px] text-gray-400 font-medium">Anlık İşlemler</p>
                    </div>
                </div>
                <button
                    onClick={fetchActivity}
                    disabled={refreshing}
                    className={`p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-indigo-600 transition-colors ${refreshing ? 'animate-spin' : ''}`}
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Feed List */}
            <div className="flex-1 overflow-y-auto p-0 custom-scrollbar relative bg-gray-50/30">
                {/* Vertical Timeline Line */}
                <div className="absolute left-[29px] top-0 bottom-0 w-[2px] bg-gray-100 z-0"></div>

                {loading && logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                ) : (
                    <div className="py-4 relative z-10 px-4 space-y-6">
                        <AnimatePresence initial={false}>
                            {logs.slice(0, 20).map((log, index) => {
                                const { icon, text, border, iconBg } = getActionDetails(log);
                                const isSale = log.action === 'UPDATE_STATUS' && (log.new_value === 'Onaylandı' || log.new_value === 'Teslim edildi');

                                return (
                                    <motion.div
                                        key={log.log_id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                        className="flex gap-4 group relative"
                                    >
                                        {/* Timeline Dot */}
                                        <div className="flex flex-col items-center flex-shrink-0 z-10 pt-1">
                                            <div className={`w-3 h-3 rounded-full ring-4 ring-white ${isSale ? 'bg-green-500 shadow-lg shadow-green-200' : 'bg-gray-300 group-hover:bg-indigo-500'} transition-colors duration-300`}></div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="text-xs font-bold text-gray-900">
                                                    {log.user_email.split('@')[0]}
                                                </span>
                                                <span className="text-[10px] font-medium text-gray-400">
                                                    {formatTime(log.timestamp)}
                                                </span>
                                            </div>

                                            <div className={`bg-white rounded-xl p-3 shadow-sm border ${isSale ? 'border-green-100 bg-green-50/30' : 'border-gray-100'} hover:shadow-md transition-shadow relative overflow-hidden`}>
                                                {isSale && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>}
                                                <p className="text-xs text-gray-700 font-medium leading-relaxed">
                                                    {text}
                                                </p>
                                                {log.note && (
                                                    <p className="text-[10px] text-gray-500 mt-2 italic border-t border-gray-100 pt-1.5">
                                                        "{log.note}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
