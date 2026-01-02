'use client';

import { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { Activity, Users, Phone, MessageSquare, Briefcase } from 'lucide-react';

interface PerformanceStat {
    email: string;
    totalLeads: number;
    salesCount: number;
    approvedCount: number;
    deliveredCount: number;
    callsCount: number;
    smsCount: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function TeamPerformanceReport() {
    const [stats, setStats] = useState<PerformanceStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/reports/performance');
                const data = await res.json();
                if (data.stats) {
                    setStats(data.stats);
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!stats || stats.length === 0) return null;

    // Prepare Pie Data (Portfolio Distribution)
    const pieData = stats.map(s => ({
        name: s.email.split('@')[0], // Short name
        value: s.totalLeads
    })).filter(x => x.value > 0);

    return (
        <div className="space-y-8 mt-8 border-t pt-8 print:break-before-page">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-600" />
                Personel Performans Analizi
            </h2>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Bar Chart: Activity Comparison */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 min-h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-gray-400" />
                        Aktivite Karşılaştırması
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                            data={stats}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis
                                dataKey="email"
                                tickFormatter={(val) => val.split('@')[0]}
                                stroke="#888888"
                                fontSize={12}
                            />
                            <YAxis stroke="#888888" fontSize={12} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend />
                            <Bar dataKey="callsCount" name="İşlem/Arama" fill="#8884d8" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="approvedCount" name="Onaylanan" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="deliveredCount" name="Teslim Edilen (Satış)" fill="#059669" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="smsCount" name="SMS" fill="#ffc658" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie Chart: Portfolio Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 min-h-[400px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-gray-400" />
                        Müşteri Yük Dağılımı (Portföy)
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-800">Detaylı Personel Tablosu</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Personel</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Briefcase className="w-3 h-3" /> Portföy
                                    </div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Phone className="w-3 h-3" /> Arama
                                    </div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <MessageSquare className="w-3 h-3" /> SMS
                                    </div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Activity className="w-3 h-3" /> Onay
                                    </div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Briefcase className="w-3 h-3" /> Teslim (Net)
                                    </div>
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Verimlilik</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stats.map((stat, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-medium text-gray-900">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs ring-2 ring-white">
                                                {stat.email.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold">{stat.email.split('@')[0]}</span>
                                                <span className="text-xs text-gray-400">{stat.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right text-gray-600 font-medium">{stat.totalLeads}</td>
                                    <td className="p-4 text-right text-gray-600 font-medium">{stat.callsCount}</td>
                                    <td className="p-4 text-right text-gray-600 font-medium">{stat.smsCount}</td>
                                    <td className="p-4 text-right text-blue-600 font-medium">{stat.approvedCount || 0}</td>
                                    <td className="p-4 text-right text-green-700 font-bold bg-green-50/50">{stat.deliveredCount || 0}</td>
                                    <td className="p-4 text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${(stat.deliveredCount / (stat.callsCount || 1)) > 0.05
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            %{Math.round(((stat.deliveredCount || 0) / (stat.callsCount || 1)) * 100)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
