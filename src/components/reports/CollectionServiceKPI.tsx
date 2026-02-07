'use client';

import { Package, Phone, XCircle, CheckCircle, Clock, Scale, FileText, AlertTriangle } from 'lucide-react';

interface CollectionServiceStats {
    totalFiles: number;
    paymentPromised: number;
    unreachable: number;
    promiseExpired: number;
    riskyFollowUp: number;
    attorneyPrep: number;
    attorneyDelivered: number;
}

interface CollectionServiceKPIProps {
    data: CollectionServiceStats;
    loading?: boolean;
}

export function CollectionServiceKPI({ data, loading }: CollectionServiceKPIProps) {
    if (loading) {
        return (
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-purple-600" />
                    TAHSİLAT SERVİSİ
                </h3>
                <div className="animate-pulse space-y-2">
                    <div className="h-16 bg-gray-200 rounded"></div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Calculate insights
    const activeFollowUp = data.paymentPromised + data.promiseExpired;
    const criticalCases = data.riskyFollowUp + data.attorneyPrep + data.attorneyDelivered;
    const needsAttention = data.unreachable + data.promiseExpired;

    // Generate intelligent summary
    const getSummary = () => {
        const parts = [];

        if (data.totalFiles === 0) {
            return "Şu anda takipte dosya bulunmuyor.";
        }

        // Main overview
        parts.push(`Toplam **${data.totalFiles} dosya** Gecikme sınıfında takip ediliyor.`);

        // Payment promised
        if (data.paymentPromised > 0) {
            parts.push(`✅ **${data.paymentPromised} dosyadan** ödeme sözü bekliyoruz.`);
        }

        // Attorney preparation
        if (data.attorneyPrep > 0) {
            parts.push(`📋 **${data.attorneyPrep} dosya** avukata hazırlık aşamasında.`);
        }

        // Attorney delivered
        if (data.attorneyDelivered > 0) {
            parts.push(`⚖️ **${data.attorneyDelivered} dosya** avukata teslim edilmiş durumda.`);
        }

        // Risky follow-up
        if (data.riskyFollowUp > 0) {
            parts.push(`⚠️ **${data.riskyFollowUp} dosya** riskli takipte (avukatın kabul etmediği dosyalar).`);
        }

        // Unreachable
        if (data.unreachable > 0) {
            parts.push(`📞 **${data.unreachable} müşteriye** ulaşılamıyor veya işlem bekliyor.`);
        }

        return parts.join(' ');
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-600" />
                TAHSİLAT SERVİSİ
            </h3>

            {/* AI-Style Summary Panel */}
            <div className="mb-4 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm font-bold">AI</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-gray-700 leading-relaxed">
                            {getSummary()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Stat */}
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        <span className="text-xs font-semibold text-gray-700">Toplam Dosya</span>
                    </div>
                    <span className="text-2xl font-black text-purple-600">
                        {new Intl.NumberFormat('tr-TR').format(data.totalFiles)}
                    </span>
                </div>
            </div>

            {/* Grid Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                    <div className="flex items-center gap-1 mb-1">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span className="text-[10px] font-semibold text-gray-600">Ödeme Sözü</span>
                    </div>
                    <div className="text-lg font-black text-green-600">
                        {new Intl.NumberFormat('tr-TR').format(data.paymentPromised)}
                    </div>
                </div>

                <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                    <div className="flex items-center gap-1 mb-1">
                        <XCircle className="w-3 h-3 text-red-600" />
                        <span className="text-[10px] font-semibold text-gray-600">Ulaşılamayan</span>
                    </div>
                    <div className="text-lg font-black text-red-600">
                        {new Intl.NumberFormat('tr-TR').format(data.unreachable)}
                    </div>
                </div>



                <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-1 mb-1">
                        <Package className="w-3 h-3 text-blue-600" />
                        <span className="text-[10px] font-semibold text-gray-600">Avukat Hazırlık</span>
                    </div>
                    <div className="text-lg font-black text-blue-600">
                        {new Intl.NumberFormat('tr-TR').format(data.attorneyPrep)}
                    </div>
                </div>

                <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-100">
                    <div className="flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3 h-3 text-yellow-600" />
                        <span className="text-[10px] font-semibold text-gray-600">Riskli Takip</span>
                    </div>
                    <div className="text-lg font-black text-yellow-600">
                        {new Intl.NumberFormat('tr-TR').format(data.riskyFollowUp || 0)}
                    </div>
                </div>

                <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100 col-span-2">
                    <div className="flex items-center gap-1 mb-1">
                        <Scale className="w-3 h-3 text-indigo-600" />
                        <span className="text-[10px] font-semibold text-gray-600">Avukata Teslim</span>
                    </div>
                    <div className="text-lg font-black text-indigo-600">
                        {new Intl.NumberFormat('tr-TR').format(data.attorneyDelivered)}
                    </div>
                </div>
            </div>
        </div>
    );
}
