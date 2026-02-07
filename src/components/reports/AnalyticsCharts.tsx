'use client';

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Legend } from 'recharts';

interface AnalyticsChartsProps {
    data: {
        workTypes: { name: string; value: number }[];
        topCities: { name: string; value: number }[];
        ageGroups: { name: string; value: number }[];
        incomeGroups: { name: string; value: number }[];
        cancellationRate: { approved: number; cancelled: number };
        cancellationReasons: { name: string; value: number }[];
    };
    loading?: boolean;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

// Custom label for pie charts - percentage outside
const renderPieLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, percent } = props;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 18;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.03) return null;

    return (
        <text
            x={x}
            y={y}
            fill="#374151"
            textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central"
            className="text-xs font-bold"
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export function AnalyticsCharts({ data, loading }: AnalyticsChartsProps) {
    if (loading) {
        return (
            <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
                    DETAYLI ANALİZ
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 h-48 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                            <div className="h-full bg-gray-100 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const cancellationData = [
        { name: 'Onaylanan', value: data.cancellationRate.approved, color: '#10b981' },
        { name: 'İptal', value: data.cancellationRate.cancelled, color: '#ef4444' }
    ];

    const cancellationPercent = data.cancellationRate.approved + data.cancellationRate.cancelled > 0
        ? ((data.cancellationRate.cancelled / (data.cancellationRate.approved + data.cancellationRate.cancelled)) * 100).toFixed(1)
        : '0';

    return (
        <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                📊 DETAYLI ANALİZ
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* 1. Çalışma Şekli */}
                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="text-xs font-bold text-gray-700 mb-1">Çalışma Şekli</h4>
                    <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                            <Pie
                                data={data.workTypes}
                                cx="50%"
                                cy="45%"
                                outerRadius={40}
                                paddingAngle={2}
                                dataKey="value"
                                label={renderPieLabel}
                            >
                                {data.workTypes.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => `${value} kişi`} />
                            <Legend
                                iconSize={8}
                                wrapperStyle={{ fontSize: '9px', paddingTop: '5px' }}
                                layout="horizontal"
                                align="center"
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* 2. Top 5 Şehir */}
                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="text-xs font-bold text-gray-700 mb-2">Top 5 Şehir</h4>
                    <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={data.topCities} layout="vertical" margin={{ right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fill: '#4b5563', fontWeight: 'bold' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 3. Yaş Grupları */}
                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="text-xs font-bold text-gray-700 mb-2">Yaş Grupları</h4>
                    <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={data.ageGroups} margin={{ top: 20, bottom: 5 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis hide />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="value" position="top" style={{ fontSize: '10px', fill: '#4b5563', fontWeight: 'bold' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 4. Gelir Grubu */}
                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="text-xs font-bold text-gray-700 mb-2">Gelir Grubu</h4>
                    <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={data.incomeGroups} margin={{ top: 20, bottom: 5 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                            <YAxis hide />
                            <Tooltip />
                            <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="value" position="top" style={{ fontSize: '10px', fill: '#4b5563', fontWeight: 'bold' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 5. İptal Oranı */}
                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="text-xs font-bold text-gray-700 mb-2">İptal Oranı</h4>
                    <div className="flex flex-col items-center justify-center h-[140px]">
                        <div className="relative w-32 h-32">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={cancellationData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={35}
                                        outerRadius={50}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                    >
                                        {cancellationData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => `${value} müşteri`} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-2xl font-black text-red-600">%{cancellationPercent}</div>
                                    <div className="text-[8px] text-gray-500">İptal</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 6. İptal Sebepleri */}
                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="text-xs font-bold text-gray-700 mb-2">İptal Sebepleri</h4>
                    <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={data.cancellationReasons} layout="vertical" margin={{ right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fill: '#4b5563', fontWeight: 'bold' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
