'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    Phone,
    Calendar,
    FileCheck,
    UserCheck,
    Package,
    RefreshCcw,
    TrendingUp,
    PhoneOff,
    PhoneMissed,
    XCircle,
    MessageCircle,
    FileX,
    FileText,
    Building2,
    CheckCircle,
    Ban,
    AlertCircle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { Customer, LeadStatus } from '@/lib/types';
import { CustomerListView } from './CustomerListView';

interface Stats {
    available: number;
    waiting_new: number;
    waiting_scheduled: number;
    total_scheduled?: number;
    waiting_retry: number;
    pending_approval: number;
    waiting_guarantor: number;
    delivered: number;
    approved: number;
    today_called?: number;
}

interface StatusMetric {
    label: string;
    status?: string;
    metricKey?: keyof Stats;
    icon: any;
    color: string;
    textColor: string;
    bgColor: string;
    hexColor?: string;
}

const STAT_CARDS: StatusMetric[] = [
    { label: 'Bugün Aranan', metricKey: 'today_called', icon: Phone, color: 'text-indigo-600', textColor: 'text-indigo-800', bgColor: 'bg-indigo-50' },
    { label: 'Uygun (Havuz)', status: 'HAVUZ', metricKey: 'available', icon: RefreshCcw, color: 'text-blue-600', textColor: 'text-blue-800', bgColor: 'bg-blue-50' },
    { label: 'Onay Bekleyen', status: 'Başvuru alındı', metricKey: 'pending_approval', icon: FileText, color: 'text-yellow-600', textColor: 'text-yellow-800', bgColor: 'bg-yellow-50' },
    { label: 'Kefil Bekleyen', status: 'Kefil bekleniyor', metricKey: 'waiting_guarantor', icon: UserCheck, color: 'text-orange-600', textColor: 'text-orange-800', bgColor: 'bg-orange-50' },
    { label: 'Onaylananlar', status: 'Onaylandı', metricKey: 'approved', icon: CheckCircle, color: 'text-green-600', textColor: 'text-green-800', bgColor: 'bg-green-50' },
    { label: 'Teslim Edilen', status: 'Teslim edildi', metricKey: 'delivered', icon: Package, color: 'text-emerald-600', textColor: 'text-emerald-800', bgColor: 'bg-emerald-50' },
];

export function DashboardStats({ initialStats }: { initialStats?: any }) {
    const router = useRouter();
    const { data: session } = useSession();
    const [stats, setStats] = useState<Stats | null>(initialStats || null);
    const [loading, setLoading] = useState(!initialStats);
    const [expandedStatus, setExpandedStatus] = useState<string | null>(null);
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [showAllStatuses, setShowAll] = useState(false);
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/leads/stats');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
                setStatusCounts(data.statusCounts || {});
            }
        } catch (error) {
            console.error('Failed to fetch stats', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialStats) {
            setStats(initialStats);
            setStatusCounts(initialStats.statusCounts || {});
            setLoading(false);
        } else {
            fetchStats();
        }
    }, [initialStats]);

    const handleStatusClick = async (status: string) => {
        // Redirect Admins to the dedicated Approvals page for these specific statuses
        if (session?.user?.role === 'ADMIN') {
            if (status === 'Onaylandı') {
                router.push('/dashboard/approvals?tab=approved');
                return;
            }
            if (status === 'Başvuru alındı') {
                router.push('/dashboard/approvals?tab=pending');
                return;
            }
        }

        if (expandedStatus === status) {
            setExpandedStatus(null);
            setFilteredCustomers([]);
            return;
        }

        setExpandedStatus(status);
        setLoadingCustomers(true);

        try {
            const res = await fetch(`/api/customers/by-status?status=${encodeURIComponent(status)}`);
            if (res.ok) {
                const data = await res.json();
                setFilteredCustomers(data.customers || []);
            }
        } catch (error) {
            console.error('Failed to fetch customers', error);
        } finally {
            setLoadingCustomers(false);
        }
    };

    if (loading || !stats) {
        return (
            <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
                ))}
            </div>
        );
    }

    const mainCards = [
        {
            title: 'Aranacak',
            count: stats.available,
            icon: Phone,
            color: 'bg-blue-500',
            textColor: 'text-blue-600',
            bgColor: 'bg-blue-50',
            desc: 'Aranmayı bekleyen',
            status: 'HAVUZ',
            hexColor: '#3b82f6'
        },
        {
            title: 'Randevulu',
            count: stats.total_scheduled || 0,
            icon: Calendar,
            color: 'bg-purple-500',
            textColor: 'text-purple-600',
            bgColor: 'bg-purple-50',
            desc: 'İleri tarihli görüşme',
            status: 'Daha sonra aranmak istiyor',
            hexColor: '#a855f7'
        },
        {
            title: 'Onay Bekleniyor',
            count: stats.pending_approval,
            icon: FileText,
            color: 'bg-orange-500',
            textColor: 'text-orange-600',
            bgColor: 'bg-orange-50',
            desc: 'Yönetici onayı bekliyor',
            status: 'Başvuru alındı' as LeadStatus,
            hexColor: '#f97316'
        },
        {
            title: 'Kefil Bekleyen',
            count: stats.waiting_guarantor,
            icon: UserCheck,
            color: 'bg-amber-500',
            textColor: 'text-amber-600',
            bgColor: 'bg-amber-50',
            desc: 'Kefil evrakları bekleniyor',
            status: 'Kefil bekleniyor' as LeadStatus,
            hexColor: '#f59e0b'
        },
        {
            title: 'Onaylananlar',
            count: stats.approved,
            icon: CheckCircle,
            color: 'bg-green-500',
            textColor: 'text-green-600',
            bgColor: 'bg-green-50',
            desc: 'Onaylanmış başvurular',
            status: 'Onaylandı' as LeadStatus,
            hexColor: '#22c55e'
        },
        {
            title: 'Teslim Edilen',
            count: stats.delivered,
            icon: Package,
            color: 'bg-emerald-500',
            textColor: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            desc: 'Başarıyla tamamlanan',
            status: 'Teslim edildi' as LeadStatus,
            hexColor: '#10b981'
        }
    ];

    const allStatuses: StatusMetric[] = [
        { label: 'Yeni', status: 'Yeni', icon: Phone, color: 'bg-blue-500', textColor: 'text-blue-600', bgColor: 'bg-blue-50' },
        { label: 'Ulaşılamadı', status: 'Ulaşılamadı', icon: PhoneOff, color: 'bg-gray-500', textColor: 'text-gray-600', bgColor: 'bg-gray-50' },
        { label: 'Meşgul/Hattı kapalı', status: 'Meşgul/Hattı kapalı', icon: PhoneMissed, color: 'bg-gray-500', textColor: 'text-gray-600', bgColor: 'bg-gray-50' },
        { label: 'Yanlış numara', status: 'Yanlış numara', icon: XCircle, color: 'bg-red-500', textColor: 'text-red-600', bgColor: 'bg-red-50' },
        { label: 'WhatsApp bilgi istiyor', status: "WhatsApp'tan bilgi istiyor", icon: MessageCircle, color: 'bg-green-500', textColor: 'text-green-600', bgColor: 'bg-green-50' },
        { label: 'E-Devlet paylaşmadı', status: 'E-Devlet paylaşmak istemedi', icon: FileX, color: 'bg-red-500', textColor: 'text-red-600', bgColor: 'bg-red-50' },
        { label: 'Kefil Bekleniyor', status: 'Kefil bekleniyor', metricKey: 'waiting_guarantor', icon: UserCheck, color: 'bg-amber-500', textColor: 'text-amber-600', bgColor: 'bg-amber-50' },
        { label: 'Onay Bekleniyor', status: 'Başvuru alındı', icon: FileText, color: 'bg-orange-500', textColor: 'text-orange-600', bgColor: 'bg-orange-50' },
        { label: 'Eksik evrak bekleniyor', status: 'Eksik evrak bekleniyor', icon: FileCheck, color: 'bg-amber-500', textColor: 'text-amber-600', bgColor: 'bg-amber-50' },
        { label: 'Mağazaya davet edildi', status: 'Mağazaya davet edildi', icon: Building2, color: 'bg-cyan-500', textColor: 'text-cyan-600', bgColor: 'bg-cyan-50' },
        { label: 'Satış yapıldı/Tamamlandı', status: 'Satış yapıldı/Tamamlandı', icon: CheckCircle, color: 'bg-green-500', textColor: 'text-green-600', bgColor: 'bg-green-50' },
        { label: 'Reddetti', status: 'Reddetti', icon: Ban, color: 'bg-red-500', textColor: 'text-red-600', bgColor: 'bg-red-50' },
        { label: 'Uygun değil', status: 'Uygun değil', icon: AlertCircle, color: 'bg-orange-500', textColor: 'text-orange-600', bgColor: 'bg-orange-50' },
        { label: 'İptal/Vazgeçti', status: 'İptal/Vazgeçti', icon: XCircle, color: 'bg-gray-500', textColor: 'text-gray-600', bgColor: 'bg-gray-50' },
    ];

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-gray-600" />
                    Genel Durum Özeti
                </h2>
                <button
                    onClick={fetchStats}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
                    title="Yenile"
                >
                    <RefreshCcw className="w-5 h-5" />
                </button>
            </div>

            {/* Main Cards Grid (Clickable) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
                {mainCards.map((card, idx) => (
                    <button
                        key={idx}
                        onClick={() => card.status && handleStatusClick(card.status)}
                        className={`${card.bgColor} rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-lg transition-all transform hover:scale-105 cursor-pointer text-left ${card.status && expandedStatus === card.status ? 'ring-2 ring-indigo-500' : ''
                            }`}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                                <h3 className={`text-2xl font-bold mt-1 ${card.textColor}`}>{card.count}</h3>
                            </div>
                            <div className={`p-2 rounded-lg bg-white/60 ${card.textColor}`}>
                                <card.icon className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 truncate font-medium">
                            {card.desc}
                        </p>
                    </button>
                ))}
            </div>

            {/* All Statuses Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
                <button
                    onClick={() => setShowAll(!showAllStatuses)}
                    className="flex items-center justify-between w-full mb-4 hover:bg-gray-50 p-2 rounded-lg transition"
                >
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        📋 Tüm Durumlar ({allStatuses.length})
                    </h3>
                    {showAllStatuses ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {showAllStatuses && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {allStatuses.map((status, idx) => (
                            <button
                                key={idx}
                                onClick={() => status.status && handleStatusClick(status.status)}
                                className={`${status.bgColor} rounded-lg p-3 border border-gray-100 hover:shadow-md transition-all cursor-pointer text-left ${status.status && expandedStatus === status.status ? 'ring-2 ring-indigo-500' : ''
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <status.icon className={`w-4 h-4 ${status.textColor}`} />
                                        <span className="text-sm font-medium text-gray-700 truncate">{status.label}</span>
                                    </div>
                                    <span className={`text-sm font-bold ${status.textColor}`}>
                                        ({status.metricKey ? (stats[status.metricKey] || 0) : (statusCounts[status.status!] || 0)})
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Customer List View */}
            {expandedStatus && (
                loadingCustomers ? (
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                        <RefreshCcw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                        <p className="text-gray-500 mt-2">Yükleniyor...</p>
                    </div>
                ) : (
                    <CustomerListView
                        customers={filteredCustomers}
                        status={expandedStatus}
                        onBack={() => {
                            setExpandedStatus(null);
                            setFilteredCustomers([]);
                        }}
                    />
                )
            )}

            {/* Chart - Only show when list is not expanded */}
            {!expandedStatus && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[500px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        İşlem Hacmi ve Durum Dağılımı
                    </h3>
                    <div className="w-full h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={mainCards}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis
                                    dataKey="title"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f3f4f6' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="count" name="Adet" radius={[8, 8, 0, 0]} barSize={60}>
                                    {mainCards.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.hexColor || '#8884d8'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}
