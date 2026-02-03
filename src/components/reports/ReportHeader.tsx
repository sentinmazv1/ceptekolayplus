'use client';

import { Calendar, Printer, RefreshCw, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ReportHeaderProps {
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;
    onRefresh: () => void;
}

export function ReportHeader({ startDate, setStartDate, endDate, setEndDate, onRefresh }: ReportHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm print:hidden">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Performans Raporu</h1>
                <p className="text-sm font-medium text-gray-500">Satış ve operasyonel verilerin detaylı analizi</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {/* Date Picker Group */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm font-semibold text-gray-700 p-0 w-28 cursor-pointer"
                    />
                    <span className="text-gray-300 font-bold">→</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm font-semibold text-gray-700 p-0 w-28 cursor-pointer"
                    />
                </div>

                <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block"></div>

                <Button
                    variant="outline"
                    onClick={onRefresh}
                    className="h-10 w-10 p-0 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
                    title="Yenile"
                >
                    <RefreshCw className="w-4 h-4" />
                </Button>

                <Button
                    variant="primary"
                    onClick={() => window.print()}
                    className="h-10 w-10 p-0 rounded-xl bg-gray-900 border border-transparent text-white hover:bg-black hover:text-white shadow-md shadow-gray-200"
                    title="Yazdır"
                >
                    <Printer className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
