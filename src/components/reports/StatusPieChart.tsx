'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface StatusData {
    approved: number;
    guarantorRequested: number;
    delivered: number;
}

interface StatusPieChartProps {
    data: StatusData;
}

const COLORS = {
    approved: '#10b981',      // Green
    guarantorRequested: '#f59e0b', // Orange
    delivered: '#6366f1',     // Indigo
};

const LABELS = {
    approved: 'Onaylanan',
    guarantorRequested: 'Kefil İstenen',
    delivered: 'Teslim Edilen',
};

export function StatusPieChart({ data }: StatusPieChartProps) {
    const chartData = [
        { name: LABELS.approved, value: data.approved, color: COLORS.approved },
        { name: LABELS.guarantorRequested, value: data.guarantorRequested, color: COLORS.guarantorRequested },
        { name: LABELS.delivered, value: data.delivered, color: COLORS.delivered },
    ].filter(item => item.value > 0); // Only show segments with data

    const total = data.approved + data.guarantorRequested + data.delivered;

    if (total === 0) {
        return (
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                    MÜŞTERİ DURUM DAĞILIMI
                </h3>
                <div className="flex items-center justify-center h-64 text-gray-400">
                    Veri bulunamadı
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                MÜŞTERİ DURUM DAĞILIMI
            </h3>

            <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Pie Chart */}
                <div className="w-full md:w-1/2">
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ percent }) => percent ? `${(percent * 100).toFixed(0)}%` : '0%'}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number | undefined) => value ? new Intl.NumberFormat('tr-TR').format(value) : '0'}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Stats */}
                <div className="w-full md:w-1/2 space-y-3">
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.approved }}></div>
                            <span className="text-sm font-semibold text-gray-700">{LABELS.approved}</span>
                        </div>
                        <span className="text-lg font-black text-emerald-600">
                            {new Intl.NumberFormat('tr-TR').format(data.approved)}
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.guarantorRequested }}></div>
                            <span className="text-sm font-semibold text-gray-700">{LABELS.guarantorRequested}</span>
                        </div>
                        <span className="text-lg font-black text-amber-600">
                            {new Intl.NumberFormat('tr-TR').format(data.guarantorRequested)}
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.delivered }}></div>
                            <span className="text-sm font-semibold text-gray-700">{LABELS.delivered}</span>
                        </div>
                        <span className="text-lg font-black text-indigo-600">
                            {new Intl.NumberFormat('tr-TR').format(data.delivered)}
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 mt-4">
                        <span className="text-sm font-bold text-gray-700">TOPLAM</span>
                        <span className="text-xl font-black text-gray-900">
                            {new Intl.NumberFormat('tr-TR').format(total)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
