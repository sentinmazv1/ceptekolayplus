
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Phone, MessageSquare, Send } from 'lucide-react';

export function DailyView({ data, loading }: { data: any, loading: boolean }) {
    if (loading) return <div className="animate-pulse h-96 bg-white/5 rounded-3xl"></div>;

    const filtered = data?.filtered || {};
    const staff = filtered.staff || [];
    const trend = filtered.trend || [];
    const ops = filtered.ops || {};

    // Determine max values for bars
    const maxRevenue = Math.max(...staff.map((s: any) => s.revenue), 1);

    const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-8">

            {/* 1. STAFF SCORECARDS */}
            <div className="bg-[#1e293b]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                <h3 className="text-white font-bold text-lg mb-6">Personel Performans Karnesi</h3>
                <div className="space-y-4">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-white/5 px-4 hidden md:grid">
                        <div className="col-span-3">Personel</div>
                        <div className="col-span-3 text-center">İletişim (Tel/SMS/WP)</div>
                        <div className="col-span-2 text-center">Satış Adedi</div>
                        <div className="col-span-2 text-right">Ciro</div>
                        <div className="col-span-2 text-right">Verim</div>
                    </div>

                    {/* Rows */}
                    {staff.map((member: any, i: number) => (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            {/* Name */}
                            <div className="col-span-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                                    {member.name.charAt(0)}
                                </div>
                                <span className="font-bold text-white">{member.name}</span>
                            </div>

                            {/* Comms */}
                            <div className="col-span-3 flex justify-center gap-3 text-xs">
                                <div title="Arama" className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded text-slate-300">
                                    <Phone className="w-3 h-3" /> {member.calls}
                                </div>
                                <div title="SMS" className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded text-slate-300">
                                    <MessageSquare className="w-3 h-3" /> {member.sms}
                                </div>
                                <div title="WhatsApp" className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded text-slate-300">
                                    <Send className="w-3 h-3" /> {member.whatsapp}
                                </div>
                            </div>

                            {/* Sales Count */}
                            <div className="col-span-2 text-center font-mono text-white">
                                {member.salesCount}
                            </div>

                            {/* Revenue */}
                            <div className="col-span-2 text-right">
                                <div className="font-bold text-emerald-400">{formatCurrency(member.revenue)}</div>
                                <div className="h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${(member.revenue / maxRevenue) * 100}%` }}></div>
                                </div>
                            </div>

                            {/* Efficiency */}
                            <div className="col-span-2 text-right text-xs text-slate-400">
                                %{member.efficiency.toFixed(1)} Conv.
                            </div>
                        </div>
                    ))}

                    {!staff.length && <div className="text-center text-slate-500 py-10">Kayıt bulunamadı.</div>}
                </div>
            </div>

            {/* 2. TREND CHART */}
            <div className="bg-[#1e293b]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md h-[400px]">
                <h3 className="text-white font-bold text-lg mb-6">Günlük Ciro Trendi</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ bottom: 30 }}>
                        <defs>
                            <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                        <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => `₺${val / 1000}k`} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorTrend)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

        </div>
    );
}
