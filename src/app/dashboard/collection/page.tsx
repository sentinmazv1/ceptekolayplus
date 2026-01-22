
'use client';

import { useState, useEffect } from 'react';
import { CustomerCard } from '@/components/CustomerCard';
import { Loader2, Play, Pause, RefreshCw } from 'lucide-react';

export default function CollectionPage() {
    const [currentLead, setCurrentLead] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [autoPlay, setAutoPlay] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchNext = async () => {
        setLoading(true);
        setError(null);
        setCurrentLead(null);
        try {
            const res = await fetch('/api/collection/next');
            const json = await res.json();

            if (json.success && json.lead) {
                setCurrentLead(json.lead);
            } else {
                setError(json.message || 'Sırada bekleyen müşteri yok.');
                setCurrentLead(null);
            }
        } catch (e: any) {
            setError('Bağlantı hatası: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchNext();
    }, []);

    const handleSave = async (updatedLead: any) => {
        // Just move to next after save if autoplay is on?
        // Or user explicitly clicks next.
        // For now, let's keep current lead on screen until they click "Next".
        // But we update the local state to reflect changes (like status change).
        setCurrentLead(updatedLead);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header Control Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <div className="bg-red-100 p-3 rounded-xl">
                            <RefreshCw className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Gecikme Takip Ekranı</h1>
                            <p className="text-sm text-slate-500">Sıradaki gecikmiş müşteriyi otomatik getir.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchNext}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5" />}
                            {currentLead ? 'Sıradakine Geç' : 'Başla / Sıradaki'}
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex justify-center">
                    {loading && !currentLead && (
                        <div className="py-20 flex flex-col items-center text-slate-400">
                            <Loader2 className="w-12 h-12 animate-spin mb-4 text-indigo-500" />
                            <p>Sıradaki borçlu analizi yapılıyor...</p>
                        </div>
                    )}

                    {!loading && !currentLead && error && (
                        <div className="py-20 max-w-md text-center">
                            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <Play className="w-8 h-8 text-green-600 ml-1" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">Harika!</h3>
                                <p className="text-slate-500 mb-6">{error}</p>
                                <button onClick={fetchNext} className="text-indigo-600 font-bold hover:underline">Tekrar Dene</button>
                            </div>
                        </div>
                    )}

                    {currentLead && (
                        <div className="w-full animate-in slide-in-from-right-4 duration-500">
                            <CustomerCard
                                initialData={currentLead}
                                onSave={handleSave}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
