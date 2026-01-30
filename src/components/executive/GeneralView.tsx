
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie } from 'recharts';
import { ShieldCheck, ShieldAlert, Filter, UserCheck, Users, Briefcase } from 'lucide-react';
import { CurrentMonthBar } from './CurrentMonthBar';
import { KPISection } from './KPISection';

export function GeneralView({ data, loading }: { data: any, loading: boolean }) {
    if (loading) return <div className="animate-pulse h-96 bg-white/5 rounded-3xl"></div>;

    const monthly = data?.monthly || {};
    const funnel = monthly.funnel || {};
    const demographics = monthly.demographics || {};

    // Funnel Data
    const funnelChart = [
        { name: 'Başvuru', value: funnel.applications || 0, fill: '#6366f1' },
        { name: 'Sorgu', value: funnel.attorneyChecks || 0, fill: '#8b5cf6' },
        { name: 'Onay', value: funnel.approved || 0, fill: '#10b981' },
        { name: 'Teslim', value: funnel.delivered || 0, fill: '#059669' },
    ];

    return (
        <div className="space-y-8">
            {/* Top Bar & KPIs */}
            <CurrentMonthBar data={{ kpi: monthly }} loading={loading} />
            <KPISection data={monthly} loading={loading} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. FUNNEL & RISK */}
                <div className="space-y-6">
                    {/* Funnel */}
                    <div className="bg-[#1e293b]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <Filter className="w-5 h-5 text-indigo-400" />
                            Satış Hunisi
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={funnelChart} layout="vertical" margin={{ left: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke="#94a3b8" width={60} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                                        {funnelChart.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Risk Analysis */}
                    <div className="bg-[#1e293b]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-indigo-400" />
                            Risk Analizi (Avukat Sorgusu)
                        </h3>
                        <div className="flex items-center gap-6">
                            <div className="flex-1 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><ShieldCheck className="w-6 h-6" /></div>
                                    <div>
                                        <div className="text-sm text-slate-400">Temiz</div>
                                        <div className="text-2xl font-bold text-emerald-400">{funnel.clean}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400"><ShieldAlert className="w-6 h-6" /></div>
                                    <div>
                                        <div className="text-sm text-slate-400">Riskli</div>
                                        <div className="text-2xl font-bold text-rose-400">{funnel.risky}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. DEMOGRAPHICS */}
                <div className="bg-[#1e293b]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                    <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-400" />
                        Demografik Analiz (Başvurular)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* City */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-400 mb-3">Şehir Dağılımı</h4>
                            <div className="space-y-2">
                                {(demographics.cities || []).map(([name, val]: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <span className="text-white truncate w-24">{name}</span>
                                        <div className="flex-1 mx-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500" style={{ width: `${(val / (monthly.leadCount || 1)) * 100}%` }}></div>
                                        </div>
                                        <span className="text-slate-400">{val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Job */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2"><Briefcase className="w-3 h-3" /> Meslek Dağılımı</h4>
                            <div className="space-y-2">
                                {(demographics.jobs || []).map(([name, val]: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <span className="text-white truncate w-24">{name}</span>
                                        <div className="flex-1 mx-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-500" style={{ width: `${(val / (monthly.leadCount || 1)) * 100}%` }}></div>
                                        </div>
                                        <span className="text-slate-400">{val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
