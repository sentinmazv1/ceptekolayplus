'use client';

import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface AnalyticsViewProps {
    data: {
        city: Array<{ name: string; value: number }>;
        age: Array<{ name: string; value: number }>;
    };
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

export function AnalyticsView({ data }: AnalyticsViewProps) {

    // Sort data for better visuals
    const cityData = [...data.city].sort((a, b) => b.value - a.value).slice(0, 5); // Top 5 Cities
    const ageData = data.age;

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
        return `${(percent * 100).toFixed(0)}%`;
    };

    return (
        <div className="space-y-6 pb-24 px-6">

            {/* 1. City Distribution (Pie) */}
            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/5 shadow-xl">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center justify-between">
                    <span>Şehir Dağılımı</span>
                    <span className="text-[10px] bg-white/10 px-2 py-1 rounded">Top 5</span>
                </h3>
                <div className="h-64 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={cityData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {cityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" strokeWidth={2} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                formatter={(val) => <span className="text-gray-400 text-xs font-bold ml-1">{val}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                        <div className="text-3xl font-black text-white">{cityData.reduce((a, b) => a + b.value, 0)}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">Kayıt</div>
                    </div>
                </div>
            </div>

            {/* 2. Age Distribution (Bar) */}
            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] border border-white/5 shadow-xl">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Yaş Grupları</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={ageData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                stroke="#94a3b8"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                width={40}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                {ageData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill="#f472b6" />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Insight Card (Static Mock for Premium Feel) */}
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex gap-4 items-start">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                    <h4 className="text-white font-bold text-sm">Yapay Zeka Görüşü</h4>
                    <p className="text-indigo-200/60 text-xs mt-1 leading-relaxed">
                        İstanbul bölgesindeki 25-34 yaş grubu satışları geçen aya göre %12 artış gösterdi. Kampanyayı bu kitleye odaklamak verimi artırabilir.
                    </p>
                </div>
            </div>

        </div>
    );
}
