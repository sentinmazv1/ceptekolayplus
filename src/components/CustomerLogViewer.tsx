
import { useState, useEffect } from 'react';
import { LogEntry } from '@/lib/types';
import { Loader2, History, User, FileText, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface CustomerLogViewerProps {
    customerId: string;
}

export function CustomerLogViewer({ customerId }: CustomerLogViewerProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, [customerId]);

    const fetchLogs = async () => {
        try {
            const res = await fetch(`/api/logs?customerId=${customerId}`);
            if (res.ok) {
                const json = await res.json();
                setLogs(json.logs || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

    // Group logs by Date
    const groupedLogs: Record<string, LogEntry[]> = {};
    logs.forEach(log => {
        const date = new Date(log.timestamp).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        if (!groupedLogs[date]) groupedLogs[date] = [];
        groupedLogs[date].push(log);
    });

    return (
        <div className="space-y-8 relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-slate-200"></div>

            {Object.entries(groupedLogs).map(([date, entries]) => (
                <div key={date} className="relative">
                    {/* Date Header */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-2 bg-white border border-slate-200 rounded-full shadow-sm z-10 w-16 text-center text-xs font-bold text-slate-500 uppercase tracking-wider leading-none">
                            {date.split(' ')[0]} <br /> {date.split(' ')[1].slice(0, 3)}
                        </div>
                        <div className="h-px bg-slate-200 flex-1"></div>
                    </div>

                    <div className="space-y-4 pl-20">
                        {entries.map((log) => (
                            <div key={log.log_id} className="relative bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                                {/* Connector Dot */}
                                <div className="absolute -left-[50px] top-6 w-3 h-3 rounded-full bg-indigo-200 border-2 border-white group-hover:bg-indigo-500 transition-colors"></div>

                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">
                                                {formatAction(log.action)}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {new Date(log.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium text-slate-800">
                                            {formatMessage(log)}
                                        </div>
                                        {/* Field Changes Diff */}
                                        {log.action === 'UPDATE_FIELDS' && log.note && (
                                            <div className="mt-2 bg-slate-50 p-2 rounded text-xs border border-slate-100 italic text-slate-600 whitespace-pre-wrap">
                                                {log.note}
                                            </div>
                                        )}
                                        {log.note && log.action !== 'UPDATE_FIELDS' && (
                                            <div className="mt-2 text-xs text-slate-500 flex items-start gap-1">
                                                <FileText className="w-3 h-3 mt-0.5" /> {log.note}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-indigo-400 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-full">
                                        <User className="w-3 h-3" />
                                        {(log.user_email || 'Sistem').split('@')[0]}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {logs.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    Henüz bir işlem geçmişi yok.
                </div>
            )}
        </div>
    );
}

function formatAction(action: string) {
    const map: any = {
        'PULL_LEAD': 'Müşteri Çekildi',
        'UPDATE_STATUS': 'Durum Değişimi',
        'UPDATE_FIELDS': 'Veri Güncelleme',
        'SEND_SMS': 'SMS Gönderimi',
        'SEND_WHATSAPP': 'WhatsApp',
        'CREATED': 'Oluşturuldu',
        'CLICK_CALL': 'Arama Yapıldı'
    };
    return map[action] || action;
}

function formatMessage(log: LogEntry) {
    if (log.action === 'UPDATE_STATUS') {
        return (
            <div className="flex items-center gap-2">
                <span className="line-through text-red-400">{log.old_value || 'Belirsiz'}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="font-bold text-emerald-600">{log.new_value}</span>
            </div>
        );
    }
    if (log.action === 'PULL_LEAD') return 'Müşteri havuza atandı ve aramaya başlandı.';
    if (log.action === 'CREATED') return 'Müşteri kartı sisteme kaydedildi.';
    if (log.action === 'UPDATE_FIELDS') return 'Müşteri bilgilerinde değişiklik yapıldı.';
    return log.note || 'İşlem yapıldı.';
}
