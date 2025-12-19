'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { getRandomMessage, formatMessage } from '@/lib/activity-messages';

interface ActivityStats {
    todayApprovals: number;
    todayCalls: number;
    todayRejections: number;
    waitingToCall: number;
    whatsappCount: number;
    storeCount: number;
    topPerformer: { name: string; count: number };
    conversionRate: number;
    totalCreditApproved: number;
    topCity: { name: string; count: number };
    peakHour: number;
    upcomingBirthdays: number;
    streak: number;
    hoursSinceLastCall: number;
    activityLevel: number;
}

interface Message {
    id: string;
    type: 'success' | 'activity' | 'comparison' | 'warning' | 'fun';
    text: string;
    emoji: string;
    showConfetti?: boolean;
}

export function LiveActivityTicker() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    // Fetch stats and generate messages
    const fetchAndGenerateMessages = async () => {
        try {
            const res = await fetch('/api/activity-stats');
            if (res.ok) {
                const stats: ActivityStats = await res.json();
                const generated = generateMessages(stats);
                setMessages(generated);
            }
        } catch (error) {
            console.error('Failed to fetch activity stats:', error);
        }
    };

    // Initial fetch and interval
    useEffect(() => {
        fetchAndGenerateMessages();
        const interval = setInterval(fetchAndGenerateMessages, 30000); // 30 seconds
        return () => clearInterval(interval);
    }, []);

    // Rotate messages every 5 seconds
    useEffect(() => {
        if (messages.length === 0) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => {
                const next = (prev + 1) % messages.length;

                // Trigger confetti animation for success messages
                if (messages[next]?.showConfetti) {
                    fireConfetti();
                }

                return next;
            });
        }, 5000);

        return () => clearInterval(timer);
    }, [messages]);

    const fireConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.3 },
            colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']
        });
    };

    const currentMessage = messages[currentIndex];

    if (!currentMessage || !isVisible) return null;

    const bgColors = {
        success: 'bg-gradient-to-r from-green-500 to-emerald-600',
        activity: 'bg-gradient-to-r from-blue-500 to-indigo-600',
        comparison: 'bg-gradient-to-r from-purple-500 to-pink-600',
        warning: 'bg-gradient-to-r from-orange-500 to-red-500',
        fun: 'bg-gradient-to-r from-pink-500 to-rose-600'
    };

    return (
        <div className={`relative ${bgColors[currentMessage.type]} text-white shadow-lg`}>
            <div className="container mx-auto px-4 py-3">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center justify-center gap-3"
                    >
                        <span className="text-2xl">{currentMessage.emoji}</span>
                        <span className="text-sm md:text-base font-medium">
                            {currentMessage.text}
                        </span>

                        {/* Message counter */}
                        <span className="text-xs opacity-75 ml-auto">
                            {currentIndex + 1}/{messages.length}
                        </span>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Close button */}
            <button
                onClick={() => setIsVisible(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition"
                aria-label="Kapat"
            >
                ✕
            </button>
        </div>
    );
}

// Generate messages from stats
function generateMessages(stats: ActivityStats): Message[] {
    const messages: Message[] = [];
    const now = new Date();
    const hour = now.getHours();

    // Time-based greeting
    if (hour >= 6 && hour < 12 && stats.waitingToCall > 0) {
        messages.push({
            id: 'morning',
            type: 'fun',
            text: formatMessage(getRandomMessage('morning'), { count: stats.waitingToCall }),
            emoji: '☀️'
        });
    } else if (hour >= 12 && hour < 18 && stats.todayCalls > 0) {
        messages.push({
            id: 'noon',
            type: 'activity',
            text: formatMessage(getRandomMessage('noon'), { count: stats.todayCalls }),
            emoji: '🌞'
        });
    } else if (hour >= 18 && stats.todayApprovals > 0) {
        messages.push({
            id: 'evening',
            type: 'success',
            text: formatMessage(getRandomMessage('evening'), {
                count: stats.todayApprovals,
                calls: stats.todayCalls
            }),
            emoji: '🌆'
        });
    }

    // Approvals (with confetti!)
    if (stats.todayApprovals > 0) {
        messages.push({
            id: 'approvals',
            type: 'success',
            text: formatMessage(getRandomMessage('approvals'), { count: stats.todayApprovals }),
            emoji: '🎉',
            showConfetti: stats.todayApprovals >= 5 // Confetti for 5+ approvals
        });
    }

    // Calls
    if (stats.todayCalls > 0) {
        messages.push({
            id: 'calls',
            type: 'activity',
            text: formatMessage(getRandomMessage('calls'), { count: stats.todayCalls }),
            emoji: '📞'
        });
    }

    // New customers waiting
    if (stats.waitingToCall > 0) {
        messages.push({
            id: 'waiting',
            type: 'activity',
            text: formatMessage(getRandomMessage('newCustomers'), { count: stats.waitingToCall }),
            emoji: '🆕'
        });
    }

    // Credit approved
    if (stats.totalCreditApproved > 0) {
        messages.push({
            id: 'credit',
            type: 'success',
            text: formatMessage(getRandomMessage('creditApproved'), {
                amount: stats.totalCreditApproved.toLocaleString('tr-TR')
            }),
            emoji: '💰'
        });
    }

    // Top performer
    if (stats.topPerformer.count > 0) {
        messages.push({
            id: 'topPerformer',
            type: 'fun',
            text: formatMessage(getRandomMessage('topPerformer'), {
                name: stats.topPerformer.name,
                count: stats.topPerformer.count
            }),
            emoji: '👑'
        });
    }

    // Channel comparison
    if (stats.whatsappCount > 0 || stats.storeCount > 0) {
        messages.push({
            id: 'channels',
            type: 'comparison',
            text: formatMessage(getRandomMessage('channelWar'), {
                wa: stats.whatsappCount,
                store: stats.storeCount
            }),
            emoji: stats.whatsappCount > stats.storeCount ? '📱' : '🏪'
        });
    }

    // Rejections (motivational)
    if (stats.todayRejections > 0) {
        messages.push({
            id: 'rejections',
            type: 'warning',
            text: formatMessage(getRandomMessage('rejections'), { count: stats.todayRejections }),
            emoji: '😔'
        });
    }

    // Conversion rate goal
    if (stats.conversionRate > 0) {
        messages.push({
            id: 'goal',
            type: 'fun',
            text: formatMessage(getRandomMessage('goals'), { percent: stats.conversionRate }),
            emoji: '🎯'
        });
    }

    // Top city
    if (stats.topCity.count > 0) {
        messages.push({
            id: 'topCity',
            type: 'fun',
            text: formatMessage(getRandomMessage('topCity'), {
                city: stats.topCity.name,
                count: stats.topCity.count
            }),
            emoji: '🏙️'
        });
    }

    // Peak hour
    if (stats.peakHour) {
        messages.push({
            id: 'peakHour',
            type: 'fun',
            text: formatMessage(getRandomMessage('peakHour'), { hour: stats.peakHour }),
            emoji: '⏰'
        });
    }

    // Birthdays
    if (stats.upcomingBirthdays > 0) {
        messages.push({
            id: 'birthdays',
            type: 'fun',
            text: formatMessage(getRandomMessage('birthdays'), { count: stats.upcomingBirthdays }),
            emoji: '🎂'
        });
    }

    // Streak
    if (stats.streak > 1) {
        messages.push({
            id: 'streak',
            type: 'success',
            text: formatMessage(getRandomMessage('streaks'), { days: stats.streak }),
            emoji: '🔥',
            showConfetti: stats.streak >= 7
        });
    }

    // 💧 DATA-DRIVEN WELLNESS REMINDERS
    // Su iç - 2+ saat aramadan
    if (stats.hoursSinceLastCall >= 2) {
        messages.push({
            id: 'water',
            type: 'warning',
            text: getRandomMessage('healthReminders'),
            emoji: '💧'
        });
    }

    // Dik otur - 20+ arama (çok oturuyor)
    if (stats.todayCalls >= 20) {
        messages.push({
            id: 'posture',
            type: 'warning',
            text: getRandomMessage('postureReminders'),
            emoji: '🪑'
        });
    }

    // Ekrana bakma - yüksek aktivite
    if (stats.activityLevel >= 15) {
        messages.push({
            id: 'eyes',
            type: 'warning',
            text: getRandomMessage('eyeReminders'),
            emoji: '👀'
        });
    }

    // Mola ver - çok yüksek aktivite
    if (stats.activityLevel >= 25) {
        messages.push({
            id: 'break',
            type: 'warning',
            text: getRandomMessage('breakReminders'),
            emoji: '☕'
        });
    }

    // Fallback if no messages
    if (messages.length === 0) {
        messages.push({
            id: 'default',
            type: 'activity',
            text: '🚀 Yeni bir gün, yeni fırsatlar! Hadi başlayalım!',
            emoji: '⭐'
        });
    }

    return messages;
}
