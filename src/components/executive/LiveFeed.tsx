'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Clock, User } from 'lucide-react';

interface FeedProps {
    logs: {
        timestamp: string;
        user_email: string;
        action: string;
        note: string;
    }[];
    loading: boolean;
}

export function LiveFeed({ logs, loading }: FeedProps) {
    if (loading) return <div className="h-60 bg-white/5 rounded-3xl animate-pulse"></div>;

    return (
        <div className="bg-[#1e293b]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md h-[400px] flex flex-col">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                Canlı Akış
            </h3>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {logs.length === 0 ? (
                    <div className="text-center text-gray-500 text-xs py-10">Henüz eylem yok</div>
                ) : (
                    logs.map((log, idx) => (
                        <div key={idx} className="bg-black/20 rounded-xl p-3 border border-white/5 text-sm">
                            <div className="flex justify-between items-start gap-2 mb-1">
                                <span className="font-bold text-indigo-300 text-xs truncate max-w-[120px]">
                                    {log.user_email?.split('@')[0]}
                                </span>
                                <span className="text-[10px] text-gray-500 shrink-0 font-mono">
                                    {new Date(log.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="text-gray-300 font-medium text-xs">
                                <span className="text-white/60 font-bold mr-1">{log.action}:</span>
                                {log.note || 'İşlem yapıldı'}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
