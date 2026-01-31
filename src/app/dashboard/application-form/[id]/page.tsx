'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ApplicationFormDocument } from '@/components/ApplicationFormDocument';
import { Customer } from '@/lib/types';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ApplicationFormPage() {
    const params = useParams();
    const id = params?.id as string;
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetch(`/api/leads/${id}`)
                .then(res => res.json())
                .then(data => {
                    setCustomer(data.lead);
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [id]);

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>;
    if (!customer) return <div className="p-10 text-center">Müşteri bulunamadı.</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white text-black">
            {/* Toolbar - Hidden when printing */}
            <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden no-print">
                <h1 className="text-2xl font-bold text-gray-800">Başvuru Formu</h1>
                <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">
                    <Printer className="w-4 h-4 mr-2" /> Yazdır
                </Button>
            </div>

            {/* Document */}
            <div className="shadow-2xl print:shadow-none">
                <ApplicationFormDocument customer={customer} />
            </div>
        </div>
    );
}
