'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface ChartsProps {
    dailyTrend: { date: string; value: number }[];
    teamPerformance: { name: string; revenue: number; count: number; avgTicket: number }[];
    loading: boolean;
}

export function ChartsSection({ dailyTrend, teamPerformance, loading }: ChartsProps) {
    if (loading) {
        return <div className="h-80 bg-white/5 rounded-2xl animate-pulse mb-6"></div>;
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl">
                    <p className="text-slate-300 text-xs mb-1">{label}</p>
                    <p className="text-emerald-400 font-bold text-lg">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Main Trend Chart */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="lg:col-span-2 bg-[#1e293b]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden"
            >
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-white font-bold text-lg">Gelir Trendi</h3>
                        <p className="text-slate-400 text-xs">Seçili dönem günlük ciro dağılımı</p>
                    </div>
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyTrend}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#64748b"
                                fontSize={10}
                                tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                tickMargin={10}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={10}
                                tickFormatter={(val) => `₺${val / 1000}k`}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '5 5' }} />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#10b981"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRev)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Team Performance Bar */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-[#1e293b]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md"
            >
                <h3 className="text-white font-bold text-lg mb-1">Ekip Liderleri</h3>
                <p className="text-slate-400 text-xs mb-6">Ciro bazlı personel sıralaması</p>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teamPerformance.slice(0, 5)} layout="vertical" margin={{ left: 0, right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                stroke="#94a3b8"
                                fontSize={11}
                                width={80}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-slate-800 p-2 rounded border border-slate-700 text-xs text-white">
                                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(payload[0].value))}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={20}>
                                {teamPerformance.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#6366f1'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
        </div>
    );
}
