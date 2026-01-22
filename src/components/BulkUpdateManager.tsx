
import { useState, useEffect } from 'react';
import { Loader2, ArrowRight, CheckCircle, AlertCircle, Database, RefreshCw } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface BulkUpdateManagerProps {
    statuses: any[];
    refresh: () => void;
}

export function BulkUpdateManager({ statuses, refresh }: BulkUpdateManagerProps) {
    const { data: session } = useSession();
    const [sourceStatus, setSourceStatus] = useState('');
    const [targetStatus, setTargetStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [previewCount, setPreviewCount] = useState<number | null>(null);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    // Fetch count when Source Status changes
    useEffect(() => {
        if (!sourceStatus) {
            setPreviewCount(null);
            return;
        }

        const fetchCount = async () => {
            // We can use a search API or just a quick count endpoint. 
            // For now, let's assume we don't have a direct count endpoint but search works.
            // Actually, let's make the bulk-update endpoint handle "preview" mode or just stick to simple UI first.
            // Simplified: User trusts the system. For better UX, we could count.
            // Let's implement a simple "Check Count" button or effect if needed.
            setPreviewCount(null); // Reset for now
        };
        fetchCount();
    }, [sourceStatus]);

    const handleUpdate = async () => {
        if (!sourceStatus || !targetStatus) return;
        if (sourceStatus === targetStatus) {
            alert('Kaynak ve Hedef durum aynı olamaz.');
            return;
        }

        if (!confirm(`Tüm "${sourceStatus}" durumundaki müşterileri "${targetStatus}" durumuna taşımak istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;

        setLoading(true);
        setResult(null);

        try {
            const res = await fetch('/api/admin/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentStatus: sourceStatus,
                    newStatus: targetStatus,
                    userEmail: session?.user?.email || 'admin'
                })
            });

            const json = await res.json();

            if (json.success) {
                setResult({ success: true, message: json.message });
                setSourceStatus('');
                setTargetStatus('');
                refresh();
            } else {
                setResult({ success: false, message: json.error || 'Bir hata oluştu.' });
            }

        } catch (error: any) {
            setResult({ success: false, message: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Database className="w-32 h-32" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-indigo-50 rounded-xl">
                            <RefreshCw className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">Toplu Durum Değişikliği</h3>
                            <p className="text-sm text-gray-500">
                                Belirli bir durumdaki tüm müşterileri tek seferde başka bir duruma taşıyın.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center bg-gray-50 p-6 rounded-2xl border border-gray-100">

                        {/* Source Status */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Mevcut Durum</label>
                            <select
                                value={sourceStatus}
                                onChange={(e) => setSourceStatus(e.target.value)}
                                className="w-full text-base font-medium rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                            >
                                <option value="">Bir Durum Seçin...</option>
                                {statuses.map((s) => (
                                    <option key={s.label} value={s.label}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Arrow */}
                        <div className="flex justify-center pt-6">
                            <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-gray-400">
                                <ArrowRight className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Target Status */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">Yeni Hedef Durum</label>
                            <select
                                value={targetStatus}
                                onChange={(e) => setTargetStatus(e.target.value)}
                                className="w-full text-base font-medium rounded-lg border-emerald-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 bg-emerald-50/50 text-emerald-900"
                            >
                                <option value="">Hedef Durum Seçin...</option>
                                {statuses.map((s) => (
                                    <option key={s.label} value={s.label}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleUpdate}
                            disabled={loading || !sourceStatus || !targetStatus}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <RefreshCw className="w-5 h-5" />
                            )}
                            Toplu Güncelleme İşlemini Başlat
                        </button>
                    </div>

                    {/* Result Message */}
                    {result && (
                        <div className={`mt-6 p-4 rounded-xl border flex items-center gap-3 ${result.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                            {result.success ? <CheckCircle className="w-6 h-6 shrink-0" /> : <AlertCircle className="w-6 h-6 shrink-0" />}
                            <div>
                                <h4 className="font-bold">{result.success ? 'İşlem Başarılı' : 'Hata Oluştu'}</h4>
                                <p className="text-sm">{result.message}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                    <strong>Dikkat:</strong> Bu işlem seçilen durumdaki <u>tüm müşterileri</u> kalıcı olarak günceller.
                    Örneğin "Yeni" durumundan "Aranacak" durumuna 1000 kişi varsa, hepsi tek seferde güncellenecektir.
                    Yapılan işlemler etkinlik günlüğüne kaydedilir ancak geri alınamaz.
                </p>
            </div>
        </div>
    );
}
