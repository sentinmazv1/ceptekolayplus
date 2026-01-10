'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, PackageCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Types for notifications
type NotificationType = 'SALE_APPROVED' | 'GUARANTOR_REQUESTED' | 'DELIVERED';

interface NotificationItem {
    id: string; // Lead ID
    type: NotificationType;
    customerName: string;
    details?: string;
    timestamp: number;
}

export function ActiveNotifications() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    // 1. Poll for updates
    const checkNotifications = async () => {
        // Optimization: Don't poll if tab is hidden
        if (typeof document !== 'undefined' && document.hidden) return;

        try {
            // Fetch my leads that have specific statuses
            const res = await fetch('/api/leads/my-leads?status=active');
            if (!res.ok) return;
            const data = await res.json();

            // Filter locally for critical statuses
            const criticalLeads = data.leads.filter((lead: any) =>
                ['Onaylandı', 'Kefil Bekleniyor', 'Teslim Edildi'].includes(lead.durum)
            );

            const newNotifications: NotificationItem[] = [];
            const seenIds = JSON.parse(localStorage.getItem('seen_notifications') || '[]');

            criticalLeads.forEach((lead: any) => {
                // Generate a unique ID for this specific state change if possible
                // For simplicity, we use lead.id + status. If status changes back and forth, it might reappear, which is fine.
                const notifId = `${lead.id}-${lead.durum}`;

                if (seenIds.includes(notifId)) return;

                let type: NotificationType | null = null;
                if (lead.durum === 'Onaylandı') type = 'SALE_APPROVED';
                else if (lead.durum === 'Kefil Bekleniyor') type = 'GUARANTOR_REQUESTED';
                else if (lead.durum === 'Teslim Edildi') type = 'DELIVERED';

                if (type) {
                    newNotifications.push({
                        id: notifId, // Use composite key for tracking seen state
                        type,
                        customerName: lead.ad_soyad,
                        details: lead.kredi_limiti ? `${lead.kredi_limiti} TL` : undefined,
                        timestamp: Date.now()
                    });
                }
            });

            if (newNotifications.length > 0) {
                // Play sound?
                // const audio = new Audio('/notification.mp3'); audio.play().catch(()=>{});
                setNotifications(prev => {
                    // Merge and dedup
                    const combined = [...prev, ...newNotifications];
                    // Unique by id
                    return Array.from(new Map(combined.map(item => [item.id, item])).values());
                });
            }

        } catch (error) {
            console.error('Notification check failed', error);
        }
    };

    useEffect(() => {
        checkNotifications();
        const interval = setInterval(checkNotifications, 120000); // Check every 2 minutes (Optimized from 60s)
        return () => clearInterval(interval);
    }, []);

    const dismiss = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        // Persist to local storage
        const seenIds = JSON.parse(localStorage.getItem('seen_notifications') || '[]');
        if (!seenIds.includes(id)) {
            seenIds.push(id);
            localStorage.setItem('seen_notifications', JSON.stringify(seenIds));
        }
    };

    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
            <AnimatePresence>
                {notifications.map((n) => {
                    let config = {
                        icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
                        title: 'Satış Onaylandı! 🎉',
                        bg: 'bg-emerald-50 border-emerald-200',
                        text: 'text-emerald-900',
                        btn: 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    };

                    if (n.type === 'GUARANTOR_REQUESTED') {
                        config = {
                            icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
                            title: 'Kefil İsteniyor ⚠️',
                            bg: 'bg-amber-50 border-amber-200',
                            text: 'text-amber-900',
                            btn: 'bg-amber-600 hover:bg-amber-700 text-white'
                        };
                    } else if (n.type === 'DELIVERED') {
                        config = {
                            icon: <PackageCheck className="w-6 h-6 text-blue-600" />,
                            title: 'Teslimat Yapıldı 📦',
                            bg: 'bg-blue-50 border-blue-200',
                            text: 'text-blue-900',
                            btn: 'bg-blue-600 hover:bg-blue-700 text-white'
                        };
                    }

                    return (
                        <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 50, scale: 0.9 }}
                            className={`pointer-events-auto p-4 rounded-xl shadow-2xl border ${config.bg} flex flex-col gap-3 relative overflow-hidden`}
                        >
                            {/* Confetti effect for sale */}
                            {n.type === 'SALE_APPROVED' && (
                                <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://cdn.confettis.org/confetti.svg')] bg-repeat"></div>
                            )}

                            <div className="flex items-start gap-3 relative z-10">
                                <div className="p-2 bg-white rounded-full shadow-sm shrink-0">
                                    {config.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`font-bold text-lg leading-tight ${config.text} mb-1`}>{config.title}</h4>
                                    <p className="text-gray-700 font-medium truncate">{n.customerName}</p>
                                    {n.details && <p className="text-gray-500 text-sm mt-0.5">{n.details}</p>}
                                </div>
                                <button onClick={() => dismiss(n.id)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <Button
                                onClick={() => dismiss(n.id)}
                                className={`w-full ${config.btn} font-bold shadow-md active:scale-95 transition-transform`}
                            >
                                Gördüm, Tamamdır
                            </Button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
