
import { motion } from 'framer-motion';

interface DashboardTabsProps {
    activeTab: 'general' | 'daily' | 'stock';
    onChange: (tab: 'general' | 'daily' | 'stock') => void;
}

export function DashboardTabs({ activeTab, onChange }: DashboardTabsProps) {
    const tabs = [
        { id: 'general', label: 'Genel Bakış' },
        { id: 'daily', label: 'Günlük Detay' },
        { id: 'stock', label: 'Stok Envanter' },
    ];

    return (
        <div className="flex p-1 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 w-fit mb-8">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id as any)}
                    className="relative px-6 py-2 text-sm font-bold text-white transition-colors capitalize z-10"
                >
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="active-pill"
                            className="absolute inset-0 bg-indigo-600 rounded-lg -z-10"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                    )}
                    <span className={activeTab === tab.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}>{tab.label}</span>
                </button>
            ))}
        </div>
    );
}
