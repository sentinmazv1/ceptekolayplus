'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, BarChart3, CreditCard } from 'lucide-react';

interface KPIProps {
    data: {
        turnover: number;
        salesCount: number;
        leadCount: number;
        conversion: number;
        avgDealSize: number;
    };
    loading: boolean;
}

export function KPISection({ data, loading }: KPIProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
    };

    const items = [
        {
            label: 'Toplam Ciro',
            value: formatCurrency(data.turnover),
            sub: 'Onaylı Satışlar',
            icon: DollarSign,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20'
        },
        {
            label: 'Net Satış',
            value: data.salesCount,
            sub: 'Adet',
            icon: CreditCard,
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20'
        },
        {
            label: 'Dönüşüm',
            value: `%${data.conversion.toFixed(1)}`,
            sub: 'Satış / Toplam Veri',
            icon: Activity,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20'
        },
        {
            label: 'Ort. Sepet',
            value: formatCurrency(data.avgDealSize),
            sub: 'Satış Başına',
            icon: BarChart3,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20'
        }
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse border border-white/5"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {items.map((item, idx) => (
                <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`relative overflow-hidden rounded-2xl border ${item.border} ${item.bg} p-5 backdrop-blur-sm transition-all hover:scale-[1.02] cursor-default`}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-xl bg-white/5 ${item.color}`}>
                            <item.icon className="w-6 h-6" />
                        </div>
                        {/* Sparkline placeholder or trend could go here */}
                    </div>
                    <div>
                        <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">{item.value}</h3>
                        <p className="text-xs md:text-sm text-gray-400 font-medium mt-1">{item.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{item.sub}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
