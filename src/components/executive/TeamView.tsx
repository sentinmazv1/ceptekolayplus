'use client';

import { motion } from 'framer-motion';
import { User, Trophy, Medal, Phone, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TeamViewProps {
    teamStats: Array<{
        name: string;
        sales: number;
        revenue: number;
        image: string;
    }>;
}

export function TeamView({ teamStats }: TeamViewProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
    };

    // Sort for Podium (Top 3)
    const top3 = [...teamStats].sort((a, b) => b.sales - a.sales).slice(0, 3);
    const winner = top3[0];
    const second = top3[1];
    const third = top3[2];

    const others = teamStats.slice(3);

    return (
        <div className="space-y-8 pb-24 px-6">

            {/* 1. PODIUM (Gamification) */}
            <div className="relative pt-10 mb-8">
                <div className="flex justify-center items-end gap-2 md:gap-6">

                    {/* 2nd Place */}
                    {second && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col items-center z-10"
                        >
                            <div className="w-16 h-16 rounded-full border-4 border-gray-400 bg-gray-800 flex items-center justify-center mb-2 shadow-xl relative">
                                <span className="text-xl font-bold text-gray-400">#2</span>
                                <div className="absolute -bottom-2 bg-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {second.sales} Adet
                                </div>
                            </div>
                            <div className="h-24 w-20 md:w-24 bg-gradient-to-t from-gray-900 to-gray-700/50 rounded-t-xl border-x border-t border-gray-600/30 flex items-end justify-center pb-2">
                                <span className="text-xs font-bold text-gray-300 truncate max-w-[90%]">{second.name}</span>
                            </div>
                        </motion.div>
                    )}

                    {/* 1st Place */}
                    {winner && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="flex flex-col items-center z-20 -mx-2"
                        >
                            <div className="relative">
                                <Trophy className="w-8 h-8 text-yellow-400 absolute -top-10 left-1/2 -translate-x-1/2 animate-bounce" />
                                <div className="w-24 h-24 rounded-full border-4 border-yellow-400 bg-gray-800 flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(250,204,21,0.3)] relative">
                                    <span className="text-2xl font-black text-white">#1</span>
                                    <div className="absolute -bottom-3 bg-yellow-500 text-black text-xs font-black px-3 py-1 rounded-full shadow-lg">
                                        {winner.sales} SATIŞ
                                    </div>
                                </div>
                            </div>
                            <div className="h-32 w-24 md:w-32 bg-gradient-to-t from-yellow-900/40 to-yellow-600/20 rounded-t-2xl border-x border-t border-yellow-500/30 flex items-end justify-center pb-4 backdrop-blur-sm">
                                <div className="text-center">
                                    <div className="text-sm font-black text-yellow-400 truncate max-w-[100px]">{winner.name}</div>
                                    <div className="text-[10px] text-yellow-200/60">{formatCurrency(winner.revenue)}</div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* 3rd Place */}
                    {third && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex flex-col items-center z-10"
                        >
                            <div className="w-16 h-16 rounded-full border-4 border-orange-700 bg-gray-800 flex items-center justify-center mb-2 shadow-xl relative">
                                <span className="text-xl font-bold text-orange-700">#3</span>
                                <div className="absolute -bottom-2 bg-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full text-orange-100">
                                    {third.sales} Adet
                                </div>
                            </div>
                            <div className="h-20 w-20 md:w-24 bg-gradient-to-t from-gray-900 to-orange-900/30 rounded-t-xl border-x border-t border-orange-700/30 flex items-end justify-center pb-2">
                                <span className="text-xs font-bold text-orange-400 truncate max-w-[90%]">{third.name}</span>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* 2. List of Others */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Diğer Performanslar</h3>
                {others.map((member, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + (i * 0.1) }}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">
                            {i + 4}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-white">{member.name}</h4>
                            <div className="h-1.5 w-full bg-gray-800 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(member.sales / Math.max(winner?.sales || 1, 1)) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-black text-white text-lg">{member.sales}</div>
                            <div className="text-[10px] text-gray-500">SATIŞ</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Chart Area */}
            <div className="h-64 mt-8 p-4 rounded-3xl bg-white/5 border border-white/5">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Ciro Dağılımı</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamStats}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(val: any) => formatCurrency(Number(val) || 0)}
                        />
                        <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                            {teamStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#fbbf24' : '#6366f1'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

        </div>
    );
}
